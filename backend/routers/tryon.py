from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from backend.constants import DEMO_IMAGES
from backend.database import connect
from backend.dependencies import current_user
from backend.services.credits import record_credit_change
from backend.services.tryon import (
    calculate_cost,
    create_remote_jobs,
    decode_prompt_ids,
    encode_prompt_ids,
    fetch_remote_results,
    final_result_items,
    persist_results,
    upload_image,
)


router = APIRouter(prefix="/api/tryon/jobs", tags=["tryon"])


@router.post("")
async def create_tryon_job(
    mode: str = Form(...),
    quantity: int = Form(1),
    prompt: str = Form(""),
    garment_type: str = Form("上衣"),
    title: str = Form("AI 试衣任务"),
    image: str = Form(""),
    person_image: str = Form(""),
    clothing_image: str = Form(""),
    portrait_authorized: bool = Form(False),
    image_file: Optional[UploadFile] = File(default=None),
    person_file: Optional[UploadFile] = File(default=None),
    clothing_file: Optional[UploadFile] = File(default=None),
    user: dict = Depends(current_user),
) -> dict:
    mode = mode.strip().lower()
    quantity = max(1, min(quantity, 8))
    cost = calculate_cost(mode, quantity)
    if mode == "free":
        prompt = (
            prompt.strip()
            or "基于参考图生成自然真实的时尚写真。"
        )
    else:
        prompt = (
            prompt.strip()
            or "让图1的人物自然穿上图2中的服装，保持真实光线、姿势和服装质感。"
        )

    if mode == "free":
        if image_file and image_file.filename:
            image = await upload_image(image_file)
        elif person_file and person_file.filename:
            image = await upload_image(person_file)
        elif clothing_file and clothing_file.filename:
            image = await upload_image(clothing_file)
        image = image or person_image or clothing_image
        if not image:
            image = DEMO_IMAGES[0]
        person_image = image
        clothing_image = image
    else:
        if mode == "real" and not portrait_authorized:
            raise HTTPException(
                status_code=400, detail="真人试衣需要确认肖像授权"
            )
        if person_file and person_file.filename:
            person_image = await upload_image(person_file)
        if clothing_file and clothing_file.filename:
            clothing_image = await upload_image(clothing_file)
        if not person_image or not clothing_image:
            raise HTTPException(
                status_code=400, detail="人物图和服装图都是必填项"
            )

    with connect() as conn:
        record_credit_change(conn, user["id"], -cost, "提交试衣任务")
        job = conn.execute(
            """
            INSERT INTO tryon_jobs
                (user_id, mode, title, status, person_image, clothing_image,
                 prompt, garment_type, quantity, cost)
            VALUES (%s, %s, %s, 'submitting', %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                user["id"],
                mode,
                title.strip()[:80] or "AI 试衣任务",
                person_image,
                clothing_image,
                prompt,
                garment_type,
                quantity,
                cost,
            ),
        ).fetchone()

    try:
        remote_jobs = await create_remote_jobs(
            mode, person_image, clothing_image, prompt, quantity
        )
        prompt_id = encode_prompt_ids(remote_jobs)
    except Exception as exc:
        with connect() as conn:
            conn.execute(
                """
                UPDATE tryon_jobs
                SET status = 'failed', error = %s, updated_at = now()
                WHERE id = %s
                """,
                (str(exc), job["id"]),
            )
            record_credit_change(
                conn, user["id"], cost, "任务提交失败退款", job["id"]
            )
        raise HTTPException(
            status_code=502, detail=f"换装服务提交失败：{exc}"
        ) from exc

    with connect() as conn:
        job = conn.execute(
            """
            UPDATE tryon_jobs
            SET status = 'processing', prompt_id = %s, seed = %s,
                updated_at = now()
            WHERE id = %s
            RETURNING *
            """,
            (prompt_id, remote_jobs[0].get("seed"), job["id"]),
        ).fetchone()
    remote_payload = (
        remote_jobs[0]
        if len(remote_jobs) == 1
        else {
            "success": True,
            "prompt_ids": decode_prompt_ids(prompt_id),
            "jobs": remote_jobs,
        }
    )
    return {"job": job, "remote": remote_payload}


@router.get("")
async def list_jobs(user: dict = Depends(current_user)) -> dict:
    with connect() as conn:
        jobs = conn.execute(
            """
            SELECT *
            FROM tryon_jobs
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 30
            """,
            (user["id"],),
        ).fetchall()
    return {"jobs": jobs}


@router.get("/{job_id}")
async def get_job(
    job_id: int, user: dict = Depends(current_user)
) -> dict:
    with connect() as conn:
        job = conn.execute(
            """
            SELECT *
            FROM tryon_jobs
            WHERE id = %s AND user_id = %s
            """,
            (job_id, user["id"]),
        ).fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="任务不存在")

        if job["status"] == "processing" and job["prompt_id"]:
            try:
                remote = await fetch_remote_results(
                    job["mode"], job["prompt_id"]
                )
                if not remote.get("pending", True):
                    usable_results = final_result_items(
                        remote.get("results", [])
                    )
                    if usable_results:
                        persist_results(conn, job, usable_results)
                        actual_success = min(
                            max(1, job["quantity"]),
                            len(usable_results),
                        )
                        actual_cost = calculate_cost(
                            job["mode"], actual_success
                        )
                        refund = max(0, job["cost"] - actual_cost)
                        if refund:
                            record_credit_change(
                                conn,
                                user["id"],
                                refund,
                                "按实际成功张数退款",
                                job["id"],
                            )
                        job = conn.execute(
                            """
                            UPDATE tryon_jobs
                            SET status = 'completed', cost = %s,
                                updated_at = now(), completed_at = now()
                            WHERE id = %s
                            RETURNING *
                            """,
                            (actual_cost, job_id),
                        ).fetchone()
                    else:
                        record_credit_change(
                            conn,
                            user["id"],
                            job["cost"],
                            "生成失败退款",
                            job["id"],
                        )
                        job = conn.execute(
                            """
                            UPDATE tryon_jobs
                            SET status = 'failed',
                                error = '生成服务未返回有效输出图',
                                updated_at = now()
                            WHERE id = %s
                            RETURNING *
                            """,
                            (job_id,),
                        ).fetchone()
            except Exception as exc:
                conn.execute(
                    """
                    UPDATE tryon_jobs
                    SET error = %s, updated_at = now()
                    WHERE id = %s
                    """,
                    (str(exc), job_id),
                )
        results = conn.execute(
            """
            SELECT *
            FROM tryon_results
            WHERE job_id = %s
            ORDER BY id ASC
            """,
            (job_id,),
        ).fetchall()
    return {"job": job, "results": results}
