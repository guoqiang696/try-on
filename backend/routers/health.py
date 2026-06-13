import httpx
from fastapi import APIRouter

from backend.config import settings
from backend.database import connect


router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health() -> dict:
    try:
        with connect() as conn:
            conn.execute("SELECT 1").fetchone()
        database = {
            "status": "ok",
            "host": settings.postgres_host,
            "database": settings.postgres_db,
        }
    except Exception as exc:
        database = {"status": "unreachable", "error": str(exc)}

    if settings.mock_tryon:
        upstream = {"status": "mock"}
    else:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(
                    f"{settings.tryon_service_url}/health"
                )
                upstream = response.json()
        except Exception as exc:
            upstream = {"status": "unreachable", "error": str(exc)}
    return {
        "status": "ok",
        "database": database,
        "tryon_service": settings.tryon_service_url,
        "upstream": upstream,
    }
