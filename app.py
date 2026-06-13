import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from urllib.parse import quote_plus

import httpx
import psycopg
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from psycopg.rows import dict_row
from pydantic import BaseModel, Field


ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

TRYON_SERVICE_URL = os.getenv("TRYON_SERVICE_URL", "http://42.192.112.233:8008").rstrip("/")
SECRET_KEY = os.getenv("OPC_SECRET_KEY", "dev-opc-change-me")
TOKEN_TTL_SECONDS = int(os.getenv("OPC_TOKEN_TTL_SECONDS", str(7 * 24 * 3600)))
MOCK_TRYON = os.getenv("OPC_MOCK_TRYON", "false").lower() == "true"

POSTGRES_HOST = os.getenv("POSTGRES_HOST", "42.192.112.233")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "opc_tryon")
POSTGRES_USER = os.getenv("POSTGRES_USER", "opc")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "opc_change_me")
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql://{quote_plus(POSTGRES_USER)}:{quote_plus(POSTGRES_PASSWORD)}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}",
)

MODE_COSTS = {"model": 5, "real": 5, "free": 5}
DEMO_IMAGES = [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDVof0tdfpgZDW7gpB7FDkcCHhvmFaJgMeycPS_D1hqQA4PUAWOE78RZMeyiR4C-ehcbaRVn7AHyZub-KzAmfky2V2T_hSsf3TBc7V5rO0AwHHpWA4wE4ou44Lfp8hT69bkq44diPVdB1XbB7uxm0FYDHXzAq5TFJW4xB-3WQAIyeNSpiRsA3YX2-6wxQCY0G2gWeqMeyvL8SMdZi5GrWfzoeTqVgkTlfn2KKWS6KC1yhwvroUULAD8WbU0OTJBEsyrzsp8Jp7K",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuApL9y2vTESD99DHU3WQq-NMtDNmwGX-pvLkYiajxJTrz65FBMHqKQN_jB_pRtf0hfhxtUuI6EQEt3R8_cDhucrEYJIRLnXH-yzDPFYBjB2PyH-rcYfzif_4-NiS7IxkGmeKOtERfQySRIMr_CUmqNN4H-si21nc5Ij5blNSHUujV9JhkzpN5I4s495YYP41DYigch5Ay1DlhvS26tZ45PG2Fx4RCURhypzDnVWZnpip1YyWd7JAZK4gbgTw92C4MC0QS5DeRBJsfv6",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCgNAIIEWpIi67nYxFbpivtr4MgV-AXre2ENgE0kmUFcBOAxm8-QLb7iVRJmrLYYS5Hh9GMatQHfWVM0iEfudd9wcVwVvIK65uukqGTPcfLubI6N_KATKbLcx1G3bnkfmlvNi9YcnFzhpB8nCQssWzM_pguykMBBTJ9nVMMhXoOgr8mjegY-rcMpdI1GaNKoKDg_Brm_lc4doAsFNKpQRp2zBObxb1iF07X1kNLPMba82H1udY2-TuZBuGsWAQrZFCowYcIIMzhzZhT",
]

app = FastAPI(title="OPC 智能试衣平台", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def no_cache_frontend_assets(request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path == "/" or path.endswith((".html", ".css", ".js")):
        response.headers["Cache-Control"] = "no-store, max-age=0"
    return response


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def db() -> psycopg.Connection:
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 180_000)
    return f"pbkdf2_sha256$180000${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, rounds, salt, expected = stored.split("$", 3)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(rounds))
    return hmac.compare_digest(digest.hex(), expected)


def b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def b64_decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def create_token(user: dict[str, Any]) -> str:
    payload = {"sub": user["id"], "email": user["email"], "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    body = b64_encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(SECRET_KEY.encode(), body.encode("ascii"), hashlib.sha256).digest()
    return f"{body}.{b64_encode(signature)}"


def verify_token(token: str) -> dict[str, Any]:
    try:
        body, signature = token.split(".", 1)
        expected = b64_encode(hmac.new(SECRET_KEY.encode(), body.encode("ascii"), hashlib.sha256).digest())
        payload = json.loads(b64_decode(body))
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Token 无效") from exc
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Token 签名无效")
    if payload.get("exp", 0) < int(time.time()):
        raise HTTPException(status_code=401, detail="Token 已过期")
    return payload


def current_user(authorization: str = Header(default="")) -> dict[str, Any]:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="请先登录")
    payload = verify_token(authorization.split(" ", 1)[1].strip())
    with db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = %s", (payload["sub"],)).fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
    return user


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "avatar_url": user["avatar_url"],
        "plan": user["plan"],
        "credits": user["credits"],
        "created_at": user["created_at"],
    }


def init_db() -> None:
    with db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id BIGSERIAL PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                avatar_url TEXT NOT NULL,
                plan TEXT NOT NULL DEFAULT 'VIP 3级会员',
                credits INTEGER NOT NULL DEFAULT 250 CHECK (credits >= 0),
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
                hd_generation BOOLEAN NOT NULL DEFAULT TRUE
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tryon_jobs (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                mode TEXT NOT NULL CHECK (mode IN ('model', 'real', 'free')),
                title TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('submitting', 'processing', 'completed', 'failed')),
                prompt_id TEXT,
                person_image TEXT NOT NULL,
                clothing_image TEXT NOT NULL,
                prompt TEXT NOT NULL,
                garment_type TEXT NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                cost INTEGER NOT NULL DEFAULT 0,
                seed BIGINT,
                error TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                completed_at TIMESTAMPTZ
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tryon_results (
                id BIGSERIAL PRIMARY KEY,
                job_id BIGINT NOT NULL REFERENCES tryon_jobs(id) ON DELETE CASCADE,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                thumbnail_url TEXT,
                source TEXT NOT NULL DEFAULT 'tryon',
                favorite BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS credit_transactions (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                amount INTEGER NOT NULL,
                balance_after INTEGER NOT NULL,
                reason TEXT NOT NULL,
                job_id BIGINT REFERENCES tryon_jobs(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
        seed_demo_data(conn)


def seed_demo_data(conn: psycopg.Connection) -> None:
    if conn.execute("SELECT id FROM users WHERE email = %s", ("demo@opc.local",)).fetchone():
        return
    avatar = "https://lh3.googleusercontent.com/aida-public/AB6AXuBWGKR9HZUVfBbCH6tkrdVRVovnIXw9UDvm5u4sDRsLqCSeKGRUohrkFO2L1w83K3b0UeIG2OUHWDTUPmWJhckEv4dyiiz3c85CKXxte-dqDxRHPQ6pWconacs2wtwvCkjJliI_LlMiHbeoU6nmEdhH0mDJ5xNkE7gvu_Fs2TuqqLYggUU4hC9nwpjKj0hurWC7joh0qz_kjrSviQtHHu2O_FjDdgsdum9W8wh1AC_WluftrRMhpiVg2p5kv6k6a4cqAt6iyMWc7rmy"
    user = conn.execute(
        """
        INSERT INTO users (email, name, password_hash, avatar_url, plan, credits)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        ("demo@opc.local", "林舒然", hash_password("demo123"), avatar, "VIP 3级会员", 250),
    ).fetchone()
    conn.execute("INSERT INTO user_preferences (user_id) VALUES (%s)", (user["id"],))
    for index, image_url in enumerate(DEMO_IMAGES, start=1):
        job = conn.execute(
            """
            INSERT INTO tryon_jobs
            (user_id, mode, title, status, person_image, clothing_image, prompt, garment_type, quantity, cost, completed_at)
            VALUES (%s, %s, '示例作品', 'completed', %s, %s, '平台示例作品', '上衣', 1, 0, now())
            RETURNING *
            """,
            (user["id"], "model" if index == 1 else "real", image_url, image_url),
        ).fetchone()
        conn.execute(
            """
            INSERT INTO tryon_results (job_id, user_id, image_url, thumbnail_url, favorite)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (job["id"], user["id"], image_url, image_url, index == 2),
        )


class AuthPayload(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=6, max_length=128)


class RegisterPayload(AuthPayload):
    name: str = Field(min_length=1, max_length=40)


class RechargePayload(BaseModel):
    amount: int = Field(ge=1, le=10000)
    reason: str = Field(default="手动充值", max_length=80)


class FavoritePayload(BaseModel):
    favorite: bool


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/api/health")
async def health() -> dict[str, Any]:
    try:
        with db() as conn:
            conn.execute("SELECT 1").fetchone()
        database = {"status": "ok", "host": POSTGRES_HOST, "database": POSTGRES_DB}
    except Exception as exc:
        database = {"status": "unreachable", "error": str(exc)}
    if MOCK_TRYON:
        upstream = {"status": "mock"}
    else:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                upstream = (await client.get(f"{TRYON_SERVICE_URL}/health")).json()
        except Exception as exc:
            upstream = {"status": "unreachable", "error": str(exc)}
    return {"status": "ok", "database": database, "tryon_service": TRYON_SERVICE_URL, "upstream": upstream}


@app.post("/api/auth/register")
async def register(payload: RegisterPayload) -> dict[str, Any]:
    avatar = f"https://api.dicebear.com/9.x/initials/svg?seed={payload.name}"
    try:
        with db() as conn:
            user = conn.execute(
                """
                INSERT INTO users (email, name, password_hash, avatar_url, plan, credits)
                VALUES (%s, %s, %s, %s, '新用户', 120)
                RETURNING *
                """,
                (payload.email.lower(), payload.name.strip(), hash_password(payload.password), avatar),
            ).fetchone()
            conn.execute("INSERT INTO user_preferences (user_id) VALUES (%s)", (user["id"],))
    except psycopg.errors.UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="该邮箱已注册") from exc
    return {"token": create_token(user), "user": public_user(user)}


@app.post("/api/auth/login")
async def login(payload: AuthPayload) -> dict[str, Any]:
    with db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = %s", (payload.email.lower(),)).fetchone()
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    return {"token": create_token(user), "user": public_user(user)}


@app.get("/api/me")
async def me(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with db() as conn:
        prefs = conn.execute("SELECT * FROM user_preferences WHERE user_id = %s", (user["id"],)).fetchone()
    return {"user": public_user(user), "preferences": prefs}


@app.get("/api/profile")
async def profile(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with db() as conn:
        today_count = conn.execute(
            "SELECT COUNT(*) AS c FROM tryon_jobs WHERE user_id = %s AND created_at::date = CURRENT_DATE",
            (user["id"],),
        ).fetchone()["c"]
        total_count = conn.execute("SELECT COUNT(*) AS c FROM tryon_jobs WHERE user_id = %s", (user["id"],)).fetchone()["c"]
        favorite_count = conn.execute("SELECT COUNT(*) AS c FROM tryon_results WHERE user_id = %s AND favorite = TRUE", (user["id"],)).fetchone()["c"]
        recent = conn.execute(
            """
            SELECT DISTINCT ON (j.id) j.*, r.image_url
            FROM tryon_jobs j
            LEFT JOIN tryon_results r ON r.job_id = j.id
            WHERE j.user_id = %s
            ORDER BY j.id DESC, r.id ASC
            LIMIT 5
            """,
            (user["id"],),
        ).fetchall()
    return {
        "user": public_user(user),
        "stats": {
            "credits": user["credits"],
            "today_generations": today_count,
            "total_generations": total_count,
            "favorite_count": favorite_count,
        },
        "recent_jobs": recent,
    }


async def upload_to_tryon_service(file: UploadFile) -> str:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail=f"{file.filename} 为空文件")
    if MOCK_TRYON:
        return f"mock-upload/{file.filename}"
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{TRYON_SERVICE_URL}/upload",
            files={"file": (file.filename, content, file.content_type or "application/octet-stream")},
        )
    resp.raise_for_status()
    data = resp.json()
    return data.get("name") or data.get("full_url") or data.get("url")


async def create_remote_job(mode: str, image: str, clothing_image: str, prompt: str) -> dict[str, Any]:
    if MOCK_TRYON:
        return {"success": True, "prompt_id": f"mock-{secrets.token_hex(6)}", "seed": secrets.randbits(32)}
    if mode == "free":
        endpoint = "/image-edit/single/async"
        payload = {"image": image, "prompt": prompt}
    else:
        endpoint = "/try-on/async"
        payload = {"person_image": image, "clothing_image": clothing_image, "prompt": prompt}
    async with httpx.AsyncClient(timeout=45) as client:
        resp = await client.post(f"{TRYON_SERVICE_URL}{endpoint}", json=payload)
    resp.raise_for_status()
    return resp.json()


async def create_remote_jobs(mode: str, image: str, clothing_image: str, prompt: str, quantity: int) -> list[dict[str, Any]]:
    remotes: list[dict[str, Any]] = []
    for _ in range(max(1, quantity)):
        remotes.append(await create_remote_job(mode, image, clothing_image, prompt))
    return remotes


def encode_prompt_ids(remotes: list[dict[str, Any]]) -> str:
    prompt_ids = [item.get("prompt_id") for item in remotes if item.get("prompt_id")]
    if not prompt_ids:
        raise HTTPException(status_code=502, detail="生成服务未返回 prompt_id")
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
    if MOCK_TRYON:
        count = 1 if mode == "free" else 2
        return {"pending": False, "prompt_id": prompt_id, "results": [{"full_url": image} for image in DEMO_IMAGES[:count]]}
    endpoint = "/image-edit/result" if mode == "free" else "/try-on/result"
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(f"{TRYON_SERVICE_URL}{endpoint}/{prompt_id}")
    resp.raise_for_status()
    return resp.json()


async def fetch_remote_results(mode: str, prompt_id_value: str) -> dict[str, Any]:
    prompt_ids = decode_prompt_ids(prompt_id_value)
    responses = [await fetch_remote_result(mode, prompt_id) for prompt_id in prompt_ids]
    return {
        "pending": any(item.get("pending", True) for item in responses),
        "prompt_id": prompt_id_value,
        "results": [result for item in responses for result in item.get("results", [])],
    }


def calculate_cost(mode: str, quantity: int) -> int:
    if mode not in MODE_COSTS:
        raise HTTPException(status_code=400, detail="未知生成模式")
    return MODE_COSTS[mode]


def final_result_items(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    filtered: list[dict[str, Any]] = []
    for item in results:
        url = str(item.get("full_url") or item.get("url") or item.get("image_url") or "")
        if not url:
            continue
        if item.get("type") == "temp" or "type=temp" in url:
            continue
        filtered.append(item)
    return filtered


def record_credit_change(conn: psycopg.Connection, user_id: int, amount: int, reason: str, job_id: Optional[int] = None) -> int:
    row = conn.execute("SELECT credits FROM users WHERE id = %s FOR UPDATE", (user_id,)).fetchone()
    balance = row["credits"] + amount
    if balance < 0:
        raise HTTPException(status_code=402, detail="积分余额不足")
    conn.execute("UPDATE users SET credits = %s WHERE id = %s", (balance, user_id))
    conn.execute(
        """
        INSERT INTO credit_transactions (user_id, amount, balance_after, reason, job_id)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (user_id, amount, balance, reason, job_id),
    )
    return balance


@app.post("/api/tryon/jobs")
async def create_tryon_job(
    mode: str = Form(...),
    quantity: int = Form(1),
    prompt: str = Form(""),
    garment_type: str = Form("上衣"),
    title: str = Form("AI 试衣任务"),
    image: str = Form(""),
    person_image: str = Form(""),
    clothing_image: str = Form(""),
    image_file: Optional[UploadFile] = File(default=None),
    person_file: Optional[UploadFile] = File(default=None),
    clothing_file: Optional[UploadFile] = File(default=None),
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    mode = mode.strip().lower()
    quantity = max(1, min(quantity, 8))
    cost = calculate_cost(mode, quantity)
    if mode == "free":
        prompt = prompt.strip() or "基于参考图生成自然真实的时尚写真。"
    else:
        prompt = prompt.strip() or "让图1的人物自然穿上图2中的服装，保持真实光线、姿势和服装质感。"

    if mode == "free":
        if image_file and image_file.filename:
            image = await upload_to_tryon_service(image_file)
        elif person_file and person_file.filename:
            image = await upload_to_tryon_service(person_file)
        elif clothing_file and clothing_file.filename:
            image = await upload_to_tryon_service(clothing_file)
        image = image or person_image or clothing_image
        if not image:
            raise HTTPException(status_code=400, detail="自由风格需要上传一张服装图片")
        person_image = image
        clothing_image = image
    else:
        if person_file and person_file.filename:
            person_image = await upload_to_tryon_service(person_file)
        if clothing_file and clothing_file.filename:
            clothing_image = await upload_to_tryon_service(clothing_file)
        if not person_image or not clothing_image:
            raise HTTPException(status_code=400, detail="人物图和服装图都是必填项")

    with db() as conn:
        record_credit_change(conn, user["id"], -cost, "提交试衣任务")
        job = conn.execute(
            """
            INSERT INTO tryon_jobs
            (user_id, mode, title, status, person_image, clothing_image, prompt, garment_type, quantity, cost)
            VALUES (%s, %s, %s, 'submitting', %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (user["id"], mode, title.strip()[:80] or "AI 试衣任务", person_image, clothing_image, prompt, garment_type, quantity, cost),
        ).fetchone()

    try:
        remotes = await create_remote_jobs(mode, person_image, clothing_image, prompt, quantity)
        prompt_id = encode_prompt_ids(remotes)
    except Exception as exc:
        with db() as conn:
            conn.execute("UPDATE tryon_jobs SET status = 'failed', error = %s, updated_at = now() WHERE id = %s", (str(exc), job["id"]))
            record_credit_change(conn, user["id"], cost, "任务提交失败退款", job["id"])
        raise HTTPException(status_code=502, detail=f"换装服务提交失败：{exc}") from exc

    with db() as conn:
        job = conn.execute(
            """
            UPDATE tryon_jobs
            SET status = 'processing', prompt_id = %s, seed = %s, updated_at = now()
            WHERE id = %s
            RETURNING *
            """,
            (prompt_id, remotes[0].get("seed"), job["id"]),
        ).fetchone()
    remote_payload = remotes[0] if len(remotes) == 1 else {"success": True, "prompt_ids": decode_prompt_ids(prompt_id), "jobs": remotes}
    return {"job": job, "remote": remote_payload}


def persist_results(conn: psycopg.Connection, job: dict[str, Any], results: list[dict[str, Any]]) -> None:
    if conn.execute("SELECT COUNT(*) AS c FROM tryon_results WHERE job_id = %s", (job["id"],)).fetchone()["c"]:
        return
    for item in final_result_items(results):
        image_url = item.get("full_url") or item.get("url") or item.get("image_url")
        if image_url:
            conn.execute(
                """
                INSERT INTO tryon_results (job_id, user_id, image_url, thumbnail_url, source)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (job["id"], job["user_id"], image_url, item.get("thumbnail_url") or image_url, "image-edit" if job["mode"] == "free" else "tryon"),
            )


@app.get("/api/tryon/jobs")
async def list_jobs(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with db() as conn:
        jobs = conn.execute(
            "SELECT * FROM tryon_jobs WHERE user_id = %s ORDER BY created_at DESC LIMIT 30",
            (user["id"],),
        ).fetchall()
    return {"jobs": jobs}


@app.get("/api/tryon/jobs/{job_id}")
async def get_job(job_id: int, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with db() as conn:
        job = conn.execute("SELECT * FROM tryon_jobs WHERE id = %s AND user_id = %s", (job_id, user["id"])).fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="任务不存在")
        if job["status"] == "processing" and job["prompt_id"]:
            try:
                remote = await fetch_remote_results(job["mode"], job["prompt_id"])
                if not remote.get("pending", True):
                    usable_results = final_result_items(remote.get("results", []))
                    if usable_results:
                        persist_results(conn, job, usable_results)
                        job = conn.execute(
                            """
                            UPDATE tryon_jobs
                            SET status = 'completed', updated_at = now(), completed_at = now()
                            WHERE id = %s
                            RETURNING *
                            """,
                            (job_id,),
                        ).fetchone()
                    else:
                        job = conn.execute(
                            """
                            UPDATE tryon_jobs
                            SET status = 'failed', error = '生成服务未返回有效输出图', updated_at = now()
                            WHERE id = %s
                            RETURNING *
                            """,
                            (job_id,),
                        ).fetchone()
            except Exception as exc:
                conn.execute("UPDATE tryon_jobs SET error = %s, updated_at = now() WHERE id = %s", (str(exc), job_id))
        results = conn.execute("SELECT * FROM tryon_results WHERE job_id = %s ORDER BY id ASC", (job_id,)).fetchall()
    return {"job": job, "results": results}


@app.get("/api/gallery")
async def gallery(mode: str = "", favorite: bool = False, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    clauses = ["r.user_id = %s"]
    params: list[Any] = [user["id"]]
    if mode:
        clauses.append("j.mode = %s")
        params.append(mode)
    if favorite:
        clauses.append("r.favorite = TRUE")
    where = " AND ".join(clauses)
    with db() as conn:
        items = conn.execute(
            f"""
            SELECT r.*, j.mode, j.title, j.garment_type, j.prompt, j.created_at AS job_created_at
            FROM tryon_results r
            JOIN tryon_jobs j ON j.id = r.job_id
            WHERE {where}
            ORDER BY r.created_at DESC
            LIMIT 100
            """,
            params,
        ).fetchall()
    return {"items": items}


@app.post("/api/gallery/{result_id}/favorite")
async def set_favorite(result_id: int, payload: FavoritePayload, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with db() as conn:
        result = conn.execute("SELECT * FROM tryon_results WHERE id = %s AND user_id = %s", (result_id, user["id"])).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="作品不存在")
        conn.execute("UPDATE tryon_results SET favorite = %s WHERE id = %s", (payload.favorite, result_id))
    return {"favorite": payload.favorite}


@app.get("/api/credits/transactions")
async def credit_transactions(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM credit_transactions WHERE user_id = %s ORDER BY created_at DESC LIMIT 50",
            (user["id"],),
        ).fetchall()
    return {"transactions": rows}


@app.post("/api/credits/recharge")
async def recharge(payload: RechargePayload, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    with db() as conn:
        balance = record_credit_change(conn, user["id"], payload.amount, payload.reason)
    return {"credits": balance}


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(ROOT / "index.html")


app.mount("/shared", StaticFiles(directory=ROOT / "shared"), name="shared")
