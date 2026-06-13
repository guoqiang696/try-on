import psycopg
from fastapi import APIRouter, Depends, HTTPException

from backend.database import connect
from backend.dependencies import current_user
from backend.schemas import AuthPayload, RegisterPayload
from backend.security import (
    create_token,
    hash_password,
    public_user,
    verify_password,
)


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(payload: RegisterPayload) -> dict:
    avatar = f"https://api.dicebear.com/9.x/initials/svg?seed={payload.name}"
    try:
        with connect() as conn:
            user = conn.execute(
                """
                INSERT INTO users
                    (email, name, password_hash, avatar_url, plan, credits)
                VALUES (%s, %s, %s, %s, '新用户', 120)
                RETURNING *
                """,
                (
                    payload.email.lower(),
                    payload.name.strip(),
                    hash_password(payload.password),
                    avatar,
                ),
            ).fetchone()
            conn.execute(
                "INSERT INTO user_preferences (user_id) VALUES (%s)",
                (user["id"],),
            )
    except psycopg.errors.UniqueViolation as exc:
        raise HTTPException(status_code=409, detail="该邮箱已注册") from exc
    return {"token": create_token(user), "user": public_user(user)}


@router.post("/login")
async def login(payload: AuthPayload) -> dict:
    with connect() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = %s", (payload.email.lower(),)
        ).fetchone()
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    return {"token": create_token(user), "user": public_user(user)}


me_router = APIRouter(tags=["auth"])


@me_router.get("/api/me")
async def me(user: dict = Depends(current_user)) -> dict:
    with connect() as conn:
        preferences = conn.execute(
            "SELECT * FROM user_preferences WHERE user_id = %s",
            (user["id"],),
        ).fetchone()
    return {"user": public_user(user), "preferences": preferences}
