import json
import secrets
from typing import Any

import httpx
import psycopg
from fastapi import HTTPException, UploadFile

from backend.config import settings
from backend.constants import DEMO_IMAGES, MODE_COSTS


async def upload_image(file: UploadFile) -> str:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail=f"{file.filename} 为空文件")
    if settings.mock_tryon:
        return f"mock-upload/{file.filename}"
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{settings.tryon_service_url}/upload",
            files={
                "file": (
                    file.filename,
                    content,
                    file.content_type or "application/octet-stream",
                )
            },
        )
    response.raise_for_status()
    data = response.json()
    return data.get("name") or data.get("full_url") or data.get("url")


async def create_remote_job(
    mode: str, image: str, clothing_image: str, prompt: str
) -> dict[str, Any]:
    if settings.mock_tryon:
        return {
            "success": True,
            "prompt_id": f"mock-{secrets.token_hex(6)}",
            "seed": secrets.randbits(32),
        }
    if mode == "free":
        endpoint = "/image-edit/single/async"
        payload = {"image": image, "prompt": prompt}
    else:
        endpoint = "/try-on/async"
        payload = {
            "person_image": image,
            "clothing_image": clothing_image,
            "prompt": prompt,
        }
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            f"{settings.tryon_service_url}{endpoint}", json=payload
        )
    response.raise_for_status()
    return response.json()


async def create_remote_jobs(
    mode: str,
    image: str,
    clothing_image: str,
    prompt: str,
    quantity: int,
) -> list[dict[str, Any]]:
    jobs = []
    for _ in range(max(1, quantity)):
        jobs.append(
            await create_remote_job(mode, image, clothing_image, prompt)
        )
    return jobs


def encode_prompt_ids(jobs: list[dict[str, Any]]) -> str:
    prompt_ids = [item.get("prompt_id") for item in jobs if item.get("prompt_id")]
    if not prompt_ids:
        raise HTTPException(
            status_code=502, detail="生成服务未返回 prompt_id"
        )
    if len(prompt_ids) == 1:
        return prompt_ids[0]
    return json.dumps(prompt_ids, separators=(",", ":"))


def decode_prompt_ids(prompt_id: str) -> list[str]:
    try:
        value = json.loads(prompt_id)
    except json.JSONDecodeError:
        return [prompt_id]
    if isinstance(value, list):
        return [str(item) for item in value if item]
    return [prompt_id]


async def fetch_remote_result(mode: str, prompt_id: str) -> dict[str, Any]:
    if settings.mock_tryon:
        count = 1 if mode == "free" else 2
        return {
            "pending": False,
            "prompt_id": prompt_id,
            "results": [
                {"full_url": image} for image in DEMO_IMAGES[:count]
            ],
        }
    endpoint = "/image-edit/result" if mode == "free" else "/try-on/result"
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            f"{settings.tryon_service_url}{endpoint}/{prompt_id}"
        )
    response.raise_for_status()
    return response.json()


async def fetch_remote_results(
    mode: str, prompt_id_value: str
) -> dict[str, Any]:
    prompt_ids = decode_prompt_ids(prompt_id_value)
    responses = [
        await fetch_remote_result(mode, prompt_id) for prompt_id in prompt_ids
    ]
    return {
        "pending": any(item.get("pending", True) for item in responses),
        "prompt_id": prompt_id_value,
        "results": [
            result
            for item in responses
            for result in item.get("results", [])
        ],
    }


def calculate_cost(mode: str, quantity: int) -> int:
    if mode not in MODE_COSTS:
        raise HTTPException(status_code=400, detail="未知生成模式")
    return MODE_COSTS[mode]


def final_result_items(
    results: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    filtered = []
    for item in results:
        url = str(
            item.get("full_url")
            or item.get("url")
            or item.get("image_url")
            or ""
        )
        if not url:
            continue
        if item.get("type") == "temp" or "type=temp" in url:
            continue
        filtered.append(item)
    return filtered


def persist_results(
    conn: psycopg.Connection,
    job: dict[str, Any],
    results: list[dict[str, Any]],
) -> None:
    existing = conn.execute(
        "SELECT COUNT(*) AS c FROM tryon_results WHERE job_id = %s",
        (job["id"],),
    ).fetchone()["c"]
    if existing:
        return
    for item in final_result_items(results):
        image_url = (
            item.get("full_url")
            or item.get("url")
            or item.get("image_url")
        )
        if not image_url:
            continue
        conn.execute(
            """
            INSERT INTO tryon_results
                (job_id, user_id, image_url, thumbnail_url, source)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                job["id"],
                job["user_id"],
                image_url,
                item.get("thumbnail_url") or image_url,
                "image-edit" if job["mode"] == "free" else "tryon",
            ),
        )
