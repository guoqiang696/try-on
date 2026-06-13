from fastapi import APIRouter, Depends

from backend.database import connect
from backend.dependencies import current_user
from backend.schemas import RechargePayload
from backend.services.credits import record_credit_change


router = APIRouter(prefix="/api/credits", tags=["credits"])


@router.get("/transactions")
async def credit_transactions(user: dict = Depends(current_user)) -> dict:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM credit_transactions
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 50
            """,
            (user["id"],),
        ).fetchall()
    return {"transactions": rows}


@router.post("/recharge")
async def recharge(
    payload: RechargePayload, user: dict = Depends(current_user)
) -> dict:
    with connect() as conn:
        balance = record_credit_change(
            conn, user["id"], payload.amount, payload.reason
        )
    return {"credits": balance}
