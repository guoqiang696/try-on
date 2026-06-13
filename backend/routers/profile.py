from fastapi import APIRouter, Depends

from backend.database import connect
from backend.dependencies import current_user
from backend.security import public_user


router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("")
async def profile(user: dict = Depends(current_user)) -> dict:
    with connect() as conn:
        today_count = conn.execute(
            """
            SELECT COUNT(*) AS c
            FROM tryon_jobs
            WHERE user_id = %s AND created_at::date = CURRENT_DATE
            """,
            (user["id"],),
        ).fetchone()["c"]
        total_count = conn.execute(
            "SELECT COUNT(*) AS c FROM tryon_jobs WHERE user_id = %s",
            (user["id"],),
        ).fetchone()["c"]
        favorite_count = conn.execute(
            """
            SELECT COUNT(*) AS c
            FROM tryon_results
            WHERE user_id = %s AND favorite = TRUE
            """,
            (user["id"],),
        ).fetchone()["c"]
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
