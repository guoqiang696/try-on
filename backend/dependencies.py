from typing import Any

from fastapi import Depends, HTTPException

from backend.database import connect
from backend.security import bearer_token


def current_user(
    payload: dict[str, Any] = Depends(bearer_token),
) -> dict[str, Any]:
    with connect() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE id = %s", (payload["sub"],)
        ).fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
    return user
