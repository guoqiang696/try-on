from typing import Optional

import psycopg
from fastapi import HTTPException


def record_credit_change(
    conn: psycopg.Connection,
    user_id: int,
    amount: int,
    reason: str,
    job_id: Optional[int] = None,
) -> int:
    row = conn.execute(
        "SELECT credits FROM users WHERE id = %s FOR UPDATE", (user_id,)
    ).fetchone()
    balance = row["credits"] + amount
    if balance < 0:
        raise HTTPException(status_code=402, detail="积分余额不足")
    conn.execute(
        "UPDATE users SET credits = %s WHERE id = %s", (balance, user_id)
    )
    conn.execute(
        """
        INSERT INTO credit_transactions
            (user_id, amount, balance_after, reason, job_id)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (user_id, amount, balance, reason, job_id),
    )
    return balance
