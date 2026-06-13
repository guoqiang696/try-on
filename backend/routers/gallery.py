from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from backend.database import connect
from backend.dependencies import current_user
from backend.schemas import FavoritePayload


router = APIRouter(prefix="/api/gallery", tags=["gallery"])


@router.get("")
async def gallery(
    mode: str = "",
    favorite: bool = False,
    user: dict = Depends(current_user),
) -> dict:
    clauses = ["r.user_id = %s"]
    params: list[Any] = [user["id"]]
    if mode:
        clauses.append("j.mode = %s")
        params.append(mode)
    if favorite:
        clauses.append("r.favorite = TRUE")
    where = " AND ".join(clauses)
    with connect() as conn:
        items = conn.execute(
            f"""
            SELECT r.*, j.mode, j.title, j.garment_type, j.prompt,
                   j.created_at AS job_created_at
            FROM tryon_results r
            JOIN tryon_jobs j ON j.id = r.job_id
            WHERE {where}
            ORDER BY r.created_at DESC
            LIMIT 100
            """,
            params,
        ).fetchall()
    return {"items": items}


@router.post("/{result_id}/favorite")
async def set_favorite(
    result_id: int,
    payload: FavoritePayload,
    user: dict = Depends(current_user),
) -> dict:
    with connect() as conn:
        result = conn.execute(
            """
            SELECT *
            FROM tryon_results
            WHERE id = %s AND user_id = %s
            """,
            (result_id, user["id"]),
        ).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="作品不存在")
        conn.execute(
            "UPDATE tryon_results SET favorite = %s WHERE id = %s",
            (payload.favorite, result_id),
        )
    return {"favorite": payload.favorite}
