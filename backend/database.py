from collections.abc import Iterator

import psycopg
from psycopg.rows import dict_row

from backend.config import settings
from backend.constants import DEMO_IMAGES
from backend.security import hash_password


def connect() -> psycopg.Connection:
    return psycopg.connect(settings.database_url, row_factory=dict_row)


def connection() -> Iterator[psycopg.Connection]:
    with connect() as conn:
        yield conn


def init_db() -> None:
    with connect() as conn:
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
                status TEXT NOT NULL CHECK (
                    status IN ('submitting', 'processing', 'completed', 'failed')
                ),
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
        _seed_demo_data(conn)


def _seed_demo_data(conn: psycopg.Connection) -> None:
    existing = conn.execute(
        "SELECT id FROM users WHERE email = %s", ("demo@opc.local",)
    ).fetchone()
    if existing:
        return

    avatar = (
        "https://lh3.googleusercontent.com/aida-public/"
        "AB6AXuBWGKR9HZUVfBbCH6tkrdVRVovnIXw9UDvm5u4sDRsLqCSeKGRUohrkFO2L1w83K3b0"
        "UeIG2OUHWDTUPmWJhckEv4dyiiz3c85CKXxte-dqDxRHPQ6pWconacs2wtwvCkjJliI_LlMiH"
        "beoU6nmEdhH0mDJ5xNkE7gvu_Fs2TuqqLYggUU4hC9nwpjKj0hurWC7joh0qz_kjrSviQtHH"
        "u2O_FjDdgsdum9W8wh1AC_WluftrRMhpiVg2p5kv6k6a4cqAt6iyMWc7rmy"
    )
    user = conn.execute(
        """
        INSERT INTO users (email, name, password_hash, avatar_url, plan, credits)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (
            "demo@opc.local",
            "林舒然",
            hash_password("demo123"),
            avatar,
            "VIP 3级会员",
            250,
        ),
    ).fetchone()
    conn.execute(
        "INSERT INTO user_preferences (user_id) VALUES (%s)", (user["id"],)
    )
    for index, image_url in enumerate(DEMO_IMAGES, start=1):
        job = conn.execute(
            """
            INSERT INTO tryon_jobs
            (user_id, mode, title, status, person_image, clothing_image, prompt,
             garment_type, quantity, cost, completed_at)
            VALUES (%s, %s, '示例作品', 'completed', %s, %s, '平台示例作品',
                    '上衣', 1, 0, now())
            RETURNING *
            """,
            (
                user["id"],
                "model" if index == 1 else "real",
                image_url,
                image_url,
            ),
        ).fetchone()
        conn.execute(
            """
            INSERT INTO tryon_results
                (job_id, user_id, image_url, thumbnail_url, favorite)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (job["id"], user["id"], image_url, image_url, index == 2),
        )
