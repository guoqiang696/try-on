from typing import Optional

from pydantic import BaseModel, Field


class AuthPayload(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=6, max_length=128)


class RegisterPayload(AuthPayload):
    name: str = Field(min_length=1, max_length=40)


class RechargePayload(BaseModel):
    amount: int = Field(ge=1, le=10000)
    reason: str = Field(default="手动充值", max_length=80)


class FavoritePayload(BaseModel):
    favorite: bool


class ModelPayload(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    height: int = Field(default=0, ge=0, le=260)
    gender: str = Field(default="女", max_length=12)
    tags: list[str] = Field(default_factory=list, max_length=12)
    image: str = Field(min_length=1)
    source_post_id: Optional[int] = None


class SquarePostPayload(BaseModel):
    result_id: Optional[int] = None
    post_type: str = Field(default="tryon", pattern=r"^(model|tryon|collection)$")
    title: str = Field(min_length=1, max_length=60)
    description: str = Field(default="", max_length=400)
    image: str = Field(default="")
    model: Optional[dict] = None
    tags: list[str] = Field(default_factory=list, max_length=12)
    allow_save_model: bool = False
    allow_remix: bool = True
    style_prompt: str = Field(default="", max_length=300)


class SquareReactionPayload(BaseModel):
    active: bool


class SquareCommentPayload(BaseModel):
    text: str = Field(min_length=1, max_length=200)
