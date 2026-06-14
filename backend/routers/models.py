from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb

from backend.constants import PRESET_MODELS
from backend.database import connect
from backend.dependencies import current_user
from backend.schemas import ModelPayload


router = APIRouter(prefix="/api/models", tags=["models"])


def _row_to_model(row: dict) -> dict:
    return {
        "id": f"user-{row['id']}",
        "name": row["name"],
        "height": row["height"],
        "gender": row["gender"],
        "tags": row["tags"] or [],
        "image": row["image_url"],
        "isPreset": False,
        "sourcePostId": row["source_post_id"],
        "createdAt": row["created_at"],
    }


@router.get("")
async def list_models(user: dict = Depends(current_user)) -> dict:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM user_models
            WHERE user_id = %s
            ORDER BY created_at DESC
            """,
            (user["id"],),
        ).fetchall()
    return {"models": [*PRESET_MODELS, *[_row_to_model(row) for row in rows]]}


@router.post("")
async def create_model(
    payload: ModelPayload, user: dict = Depends(current_user)
) -> dict:
    with connect() as conn:
        row = conn.execute(
            """
            INSERT INTO user_models
                (user_id, name, height, gender, tags, image_url, source_post_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                user["id"],
                payload.name.strip(),
                payload.height,
                payload.gender.strip()[:12] or "女",
                Jsonb(payload.tags[:12]),
                payload.image,
                payload.source_post_id,
            ),
        ).fetchone()
    return {"model": _row_to_model(row)}


@router.delete("/{model_id}")
async def delete_model(model_id: str, user: dict = Depends(current_user)) -> dict:
    if model_id.startswith("preset-"):
        raise HTTPException(status_code=400, detail="预置模特不能删除")
    raw_id = model_id.removeprefix("user-")
    if not raw_id.isdigit():
        raise HTTPException(status_code=400, detail="模特 ID 无效")
    with connect() as conn:
        row = conn.execute(
            """
            DELETE FROM user_models
            WHERE id = %s AND user_id = %s
            RETURNING id
            """,
            (int(raw_id), user["id"]),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="模特不存在")
    return {"deleted": True}
