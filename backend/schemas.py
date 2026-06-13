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
