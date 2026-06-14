from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from psycopg.types.json import Jsonb

from backend.database import connect
from backend.dependencies import current_user
from backend.schemas import (
    SquareCommentPayload,
    SquarePostPayload,
    SquareReactionPayload,
)


router = APIRouter(prefix="/api/square", tags=["square"])


def _public_author(user: dict) -> tuple[str, str]:
    return user["name"], user["avatar_url"]


def _format_comment(row: dict) -> dict:
    return {
        "id": row["id"],
        "user": row["author_name"],
        "avatar": row["author_avatar"],
        "text": row["text"],
        "created_at": row["created_at"],
    }


def _format_post(row: dict, comments: Optional[list[dict]] = None) -> dict:
    return {
        "id": row["id"],
        "author": {
            "id": row["user_id"],
            "name": row["author_name"],
            "avatar": row["author_avatar"],
            "badge": row["author_badge"],
        },
        "type": row["post_type"],
        "title": row["title"],
        "description": row["description"],
        "image": row["image_url"],
        "model": row["model"],
        "tags": row["tags"] or [],
        "likes": row["likes"],
        "saves": row["saves"],
        "allowSaveModel": row["allow_save_model"],
        "allowRemix": row["allow_remix"],
        "stylePrompt": row["style_prompt"],
        "sourceResultId": row["source_result_id"],
        "createdAt": row["created_at"],
        "comments": comments or [],
    }


def _post_query(where: str = "", suffix: str = "") -> str:
    return f"""
        SELECT *
        FROM square_posts
        {where}
        ORDER BY created_at DESC
        {suffix}
    """


@router.get("")
async def list_square_posts(
    tab: str = "recommend",
    q: str = "",
    tag: str = "",
) -> dict:
    clauses: list[str] = []
    params: list[Any] = []
    if tab in {"model", "tryon"}:
        clauses.append("post_type = %s")
        params.append(tab)
    if q:
        clauses.append("(title ILIKE %s OR description ILIKE %s OR author_name ILIKE %s)")
        params.extend([f"%{q}%", f"%{q}%", f"%{q}%"])
    if tag:
        clauses.append("tags ? %s")
        params.append(tag)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    order = "ORDER BY likes DESC, saves DESC" if tab == "top" else "ORDER BY created_at DESC"
    with connect() as conn:
        rows = conn.execute(
            f"SELECT * FROM square_posts {where} {order} LIMIT 100",
            params,
        ).fetchall()
    return {"posts": [_format_post(row) for row in rows]}


@router.get("/{post_id}")
async def square_post(post_id: int) -> dict:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM square_posts WHERE id = %s", (post_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="广场作品不存在")
        comments = conn.execute(
            """
            SELECT *
            FROM square_post_comments
            WHERE post_id = %s
            ORDER BY created_at DESC
            LIMIT 50
            """,
            (post_id,),
        ).fetchall()
    return {"post": _format_post(row, [_format_comment(item) for item in comments])}


@router.post("")
async def create_square_post(
    payload: SquarePostPayload,
    user: dict = Depends(current_user),
) -> dict:
    image = payload.image
    if payload.result_id:
        with connect() as conn:
            result = conn.execute(
                """
                SELECT r.*, j.prompt, j.title AS job_title
                FROM tryon_results r
                JOIN tryon_jobs j ON j.id = r.job_id
                WHERE r.id = %s AND r.user_id = %s
                """,
                (payload.result_id, user["id"]),
            ).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="作品不存在")
        image = image or result["image_url"]
    if not image:
        raise HTTPException(status_code=400, detail="发布广场需要图片")

    author_name, author_avatar = _public_author(user)
    with connect() as conn:
        row = conn.execute(
            """
            INSERT INTO square_posts
                (user_id, source_result_id, author_name, author_avatar,
                 author_badge, post_type, title, description, image_url, model,
                 tags, allow_save_model, allow_remix, style_prompt)
            VALUES (%s, %s, %s, %s, '创作者', %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                user["id"],
                payload.result_id,
                author_name,
                author_avatar,
                payload.post_type,
                payload.title.strip(),
                payload.description.strip(),
                image,
                Jsonb(payload.model),
                Jsonb(payload.tags[:12]),
                payload.allow_save_model,
                payload.allow_remix,
                payload.style_prompt.strip(),
            ),
        ).fetchone()
    return {"post": _format_post(row)}


def _set_reaction(
    post_id: int,
    user_id: int,
    reaction: str,
    active: bool,
) -> dict:
    column = "likes" if reaction == "like" else "saves"
    with connect() as conn:
        post = conn.execute(
            "SELECT id FROM square_posts WHERE id = %s", (post_id,)
        ).fetchone()
        if not post:
            raise HTTPException(status_code=404, detail="广场作品不存在")
        existing = conn.execute(
            """
            SELECT 1
            FROM square_post_reactions
            WHERE post_id = %s AND user_id = %s AND reaction = %s
            """,
            (post_id, user_id, reaction),
        ).fetchone()
        if active and not existing:
            conn.execute(
                """
                INSERT INTO square_post_reactions (post_id, user_id, reaction)
                VALUES (%s, %s, %s)
                """,
                (post_id, user_id, reaction),
            )
            conn.execute(
                f"UPDATE square_posts SET {column} = {column} + 1 WHERE id = %s",
                (post_id,),
            )
        elif not active and existing:
            conn.execute(
                """
                DELETE FROM square_post_reactions
                WHERE post_id = %s AND user_id = %s AND reaction = %s
                """,
                (post_id, user_id, reaction),
            )
            conn.execute(
                f"UPDATE square_posts SET {column} = GREATEST(0, {column} - 1) WHERE id = %s",
                (post_id,),
            )
        row = conn.execute(
            "SELECT likes, saves FROM square_posts WHERE id = %s", (post_id,)
        ).fetchone()
    return {"likes": row["likes"], "saves": row["saves"], "active": active}


@router.post("/{post_id}/like")
async def like_post(
    post_id: int,
    payload: SquareReactionPayload,
    user: dict = Depends(current_user),
) -> dict:
    return _set_reaction(post_id, user["id"], "like", payload.active)


@router.post("/{post_id}/save")
async def save_post(
    post_id: int,
    payload: SquareReactionPayload,
    user: dict = Depends(current_user),
) -> dict:
    return _set_reaction(post_id, user["id"], "save", payload.active)


@router.post("/{post_id}/comments")
async def comment_post(
    post_id: int,
    payload: SquareCommentPayload,
    user: dict = Depends(current_user),
) -> dict:
    author_name, author_avatar = _public_author(user)
    with connect() as conn:
        post = conn.execute(
            "SELECT id FROM square_posts WHERE id = %s", (post_id,)
        ).fetchone()
        if not post:
            raise HTTPException(status_code=404, detail="广场作品不存在")
        row = conn.execute(
            """
            INSERT INTO square_post_comments
                (post_id, user_id, author_name, author_avatar, text)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
            """,
            (post_id, user["id"], author_name, author_avatar, payload.text.strip()),
        ).fetchone()
    return {"comment": _format_comment(row)}


@router.post("/{post_id}/save-model")
async def save_model_from_post(
    post_id: int, user: dict = Depends(current_user)
) -> dict:
    with connect() as conn:
        post = conn.execute(
            "SELECT * FROM square_posts WHERE id = %s", (post_id,)
        ).fetchone()
        if not post:
            raise HTTPException(status_code=404, detail="广场作品不存在")
        if not post["allow_save_model"] or not post["model"]:
            raise HTTPException(status_code=400, detail="该作品不支持保存模特")
        model = post["model"]
        existing = conn.execute(
            """
            SELECT *
            FROM user_models
            WHERE user_id = %s AND source_post_id = %s
            """,
            (user["id"], post_id),
        ).fetchone()
        if existing:
            return {"model_id": f"user-{existing['id']}", "exists": True}
        row = conn.execute(
            """
            INSERT INTO user_models
                (user_id, name, height, gender, tags, image_url, source_post_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                user["id"],
                model.get("name") or post["title"],
                int(model.get("height") or 0),
                model.get("gender") or "女",
                Jsonb(["广场", *(post["tags"] or [])[:2]]),
                model.get("src") or post["image_url"],
                post_id,
            ),
        ).fetchone()
    return {"model_id": f"user-{row['id']}", "exists": False}
