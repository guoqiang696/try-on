"""
换衣工作流 HTTP 服务
POST /try-on  — 提交换衣任务并同步等待结果
POST /try-on/async  — 提交并立即返回 prompt_id
GET  /try-on/result/{prompt_id}  — 查询结果
POST /image-edit/single  — 提交单图编辑任务并同步等待结果
POST /image-edit/single/async  — 提交单图编辑并立即返回 prompt_id
GET  /image-edit/result/{prompt_id}  — 查询单图编辑结果
POST /upload  — 上传图片到 ComfyUI input 目录
GET  /health  — 服务健康检查
"""

import asyncio
import os
import random
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# zealman 面板地址
BASE_URL = os.getenv("COMFY_PANEL_BASE_URL", "https://uu703085-779852d74bc9.bjb2.seetacloud.com:8443").rstrip("/")
# 换衣工作流在面板里保存的名称（文件名）
WORKFLOW_ID = os.getenv("TRYON_WORKFLOW_ID", "HZ")
SINGLE_IMAGE_WORKFLOW_ID = os.getenv(
    "SINGLE_IMAGE_WORKFLOW_ID",
    "F01-FireRed-Image-Edit-1-single-image-optimized",
)

# 节点 ID 对应关系（来自 换衣.json）
NODE_PERSON_IMAGE  = "207:image"   # LoadImage — 人物图
NODE_CLOTHING_IMAGE = "208:image"  # LoadImage — 衣服图
NODE_PROMPT        = "209:prompt"  # TextEncodeQwenImageEditPlusAdvance — 指令
NODE_SEED          = "204:seed"    # KSampler — 随机种子

# 节点 ID 对应关系（来自 F01-FireRed-Image-Edit-1-single-image-optimized.json）
NODE_SINGLE_IMAGE  = os.getenv("SINGLE_NODE_IMAGE", "19:image")
NODE_SINGLE_PROMPT = os.getenv("SINGLE_NODE_PROMPT", "22:prompt")
NODE_SINGLE_SEED   = os.getenv("SINGLE_NODE_SEED", "15:seed")

DEFAULT_PROMPT = "让图1的人物穿上图2中的连衣裙，不要给人物增加其他衣物"
POLL_INTERVAL  = 2.0   # 轮询间隔秒
POLL_TIMEOUT   = 300   # 最长等待秒


app = FastAPI(title="换衣工作流服务", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOW_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- 请求/响应模型 ----------

class TryOnRequest(BaseModel):
    person_image: str            # 公网 URL 或 base64 或已上传的 name
    clothing_image: str          # 公网 URL 或 base64 或已上传的 name
    prompt: Optional[str] = None # 换衣指令，不传使用默认值
    seed: Optional[int] = None   # 随机种子，不传则随机生成


class SingleImageEditRequest(BaseModel):
    image: str
    prompt: str
    seed: Optional[int] = None


# ---------- 内部工具函数 ----------

def _build_tryon_input_values(person_image: str, clothing_image: str,
                              prompt: str, seed: int) -> dict:
    return {
        NODE_PERSON_IMAGE:   person_image,
        NODE_CLOTHING_IMAGE: clothing_image,
        NODE_PROMPT:         prompt,
        NODE_SEED:           seed,
    }


def _build_single_input_values(image: str, prompt: str, seed: int) -> dict:
    return {
        NODE_SINGLE_IMAGE: image,
        NODE_SINGLE_PROMPT: prompt,
        NODE_SINGLE_SEED: seed,
    }


def _add_full_urls(results: list[dict]) -> list[dict]:
    for item in results:
        if item.get("url", "").startswith("/"):
            item["full_url"] = BASE_URL + item["url"]
    return results


async def _submit(client: httpx.AsyncClient, workflow_id: str, input_values: dict) -> str:
    """提交工作流任务，返回 prompt_id。"""
    resp = await client.post(
        f"{BASE_URL}/api/workflow/generate",
        json={"workflow_id": workflow_id, "input_values": input_values},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data.get("success"):
        raise HTTPException(status_code=502, detail=data.get("error", "提交失败"))
    return data["prompt_id"]


async def _poll_result(client: httpx.AsyncClient, prompt_id: str) -> dict:
    """轮询直到任务完成，返回 results 列表。"""
    elapsed = 0.0
    while elapsed < POLL_TIMEOUT:
        await asyncio.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL
        resp = await client.get(
            f"{BASE_URL}/api/workflow/result",
            params={"prompt_id": prompt_id},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data.get("pending", True):
            results = data.get("results", [])
            return _add_full_urls(results)
    raise HTTPException(status_code=504, detail=f"超过 {POLL_TIMEOUT}s 仍未完成")


# ---------- API 路由 ----------

@app.get("/health")
async def health():
    """服务与上游面板健康检查。"""
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(f"{BASE_URL}/api/health", timeout=10)
            upstream = r.json()
        except Exception as e:
            upstream = {"error": str(e)}
    return {"status": "ok", "upstream": upstream}


@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    上传图片到 ComfyUI input 目录。
    返回 { name } —— 可直接填入 person_image / clothing_image 字段。
    """
    content = await file.read()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{BASE_URL}/api/comfy/upload/file",
            files={"file": (file.filename, content, file.content_type)},
            data={"overwrite": "true"},
            timeout=60,
        )
    resp.raise_for_status()
    data = resp.json()
    return {"name": data["name"], "subfolder": data.get("subfolder", ""), "type": data.get("type", "input")}


@app.post("/try-on/async")
async def try_on_async(req: TryOnRequest):
    """
    提交换衣任务，立即返回 prompt_id。
    后续用 GET /try-on/result/{prompt_id} 查询结果。
    """
    seed = req.seed if req.seed is not None else random.randint(0, 2**32 - 1)
    prompt = req.prompt or DEFAULT_PROMPT
    input_values = _build_tryon_input_values(req.person_image, req.clothing_image, prompt, seed)

    async with httpx.AsyncClient() as client:
        prompt_id = await _submit(client, WORKFLOW_ID, input_values)

    return {
        "success": True,
        "prompt_id": prompt_id,
        "result_url": f"/try-on/result/{prompt_id}",
        "seed": seed,
    }


@app.get("/try-on/result/{prompt_id}")
async def get_result(prompt_id: str):
    """查询换衣任务结果（pending=true 表示还在生成）。"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/api/workflow/result",
            params={"prompt_id": prompt_id},
            timeout=15,
        )
    resp.raise_for_status()
    data = resp.json()
    results = _add_full_urls(data.get("results", []))
    return {
        "pending": data.get("pending", True),
        "prompt_id": prompt_id,
        "results": results,
    }


@app.post("/try-on")
async def try_on(req: TryOnRequest):
    """
    提交换衣任务并同步等待结果（阻塞直到生成完成）。
    生成通常需要 10~60 秒，请合理设置客户端超时。
    """
    seed = req.seed if req.seed is not None else random.randint(0, 2**32 - 1)
    prompt = req.prompt or DEFAULT_PROMPT
    input_values = _build_tryon_input_values(req.person_image, req.clothing_image, prompt, seed)

    async with httpx.AsyncClient() as client:
        prompt_id = await _submit(client, WORKFLOW_ID, input_values)
        results = await _poll_result(client, prompt_id)

    return {
        "success": True,
        "prompt_id": prompt_id,
        "seed": seed,
        "results": results,
    }


@app.post("/image-edit/single/async")
async def image_edit_single_async(req: SingleImageEditRequest):
    """
    提交单图编辑任务，立即返回 prompt_id。
    后续用 GET /image-edit/result/{prompt_id} 查询结果。
    """
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt 不能为空")
    seed = req.seed if req.seed is not None else random.randint(0, 2**32 - 1)
    input_values = _build_single_input_values(req.image, prompt, seed)

    async with httpx.AsyncClient() as client:
        prompt_id = await _submit(client, SINGLE_IMAGE_WORKFLOW_ID, input_values)

    return {
        "success": True,
        "prompt_id": prompt_id,
        "result_url": f"/image-edit/result/{prompt_id}",
        "seed": seed,
    }


@app.get("/image-edit/result/{prompt_id}")
async def get_image_edit_result(prompt_id: str):
    """查询单图编辑任务结果（pending=true 表示还在生成）。"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{BASE_URL}/api/workflow/result",
            params={"prompt_id": prompt_id},
            timeout=15,
        )
    resp.raise_for_status()
    data = resp.json()
    return {
        "pending": data.get("pending", True),
        "prompt_id": prompt_id,
        "results": _add_full_urls(data.get("results", [])),
    }


@app.post("/image-edit/single")
async def image_edit_single(req: SingleImageEditRequest):
    """
    提交单图编辑任务并同步等待结果（阻塞直到生成完成）。
    """
    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt 不能为空")
    seed = req.seed if req.seed is not None else random.randint(0, 2**32 - 1)
    input_values = _build_single_input_values(req.image, prompt, seed)

    async with httpx.AsyncClient() as client:
        prompt_id = await _submit(client, SINGLE_IMAGE_WORKFLOW_ID, input_values)
        results = await _poll_result(client, prompt_id)

    return {
        "success": True,
        "prompt_id": prompt_id,
        "seed": seed,
        "results": results,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "service:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8002")),
        reload=os.getenv("RELOAD", "false").lower() == "true",
    )
