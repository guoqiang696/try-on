import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from fastapi import Header, HTTPException

from backend.config import settings


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), 180_000
    )
    return f"pbkdf2_sha256$180000${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, rounds, salt, expected = stored.split("$", 3)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), int(rounds)
    )
    return hmac.compare_digest(digest.hex(), expected)


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64_decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def create_token(user: dict[str, Any]) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "exp": int(time.time()) + settings.token_ttl_seconds,
    }
    body = _b64_encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(
        settings.secret_key.encode(), body.encode("ascii"), hashlib.sha256
    ).digest()
    return f"{body}.{_b64_encode(signature)}"


def verify_token(token: str) -> dict[str, Any]:
    try:
        body, signature = token.split(".", 1)
        expected = _b64_encode(
            hmac.new(
                settings.secret_key.encode(),
                body.encode("ascii"),
                hashlib.sha256,
            ).digest()
        )
        payload = json.loads(_b64_decode(body))
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Token 无效") from exc
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Token 签名无效")
    if payload.get("exp", 0) < int(time.time()):
        raise HTTPException(status_code=401, detail="Token 已过期")
    return payload


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


def bearer_token(authorization: str = Header(default="")) -> dict[str, Any]:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="请先登录")
    return verify_token(authorization.split(" ", 1)[1].strip())
