# backend/app/models/user.py
import time
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class UserRoleType(str, Enum):
    ADMIN = "ADMIN"
    SUPERVISOR = "SUPERVISOR"
    TRAINER = "TRAINER"
    PARTICIPANT = "PARTICIPANT"
    PLAYER = "PLAYER"


class User(BaseModel):
    id: str
    username: str
    email: str
    display_name: str
    hashed_password: str
    salt: str
    role: UserRoleType = UserRoleType.PLAYER
    cohort_id: Optional[str] = "cohort_cyber_defense_2026"
    audience_mode: str = "professional"  # "professional" | "kids" | "seniors"
    ui_language_override: Optional[str] = None
    created_at: float = Field(default_factory=lambda: time.time())


class UserPublic(BaseModel):
    id: str
    username: str
    email: str
    display_name: str
    role: UserRoleType
    cohort_id: Optional[str] = None
    audience_mode: str = "professional"
    ui_language_override: Optional[str] = None
    created_at: float


class UserLoginRequest(BaseModel):
    username: str
    password: Optional[str] = ""


class UserRegisterRequest(BaseModel):
    username: str
    email: Optional[str] = None
    password: Optional[str] = ""
    display_name: Optional[str] = None
    role: Optional[UserRoleType] = UserRoleType.PLAYER
    cohort_id: Optional[str] = "cohort_cyber_defense_2026"
    audience_mode: Optional[str] = "professional"
    ui_language_override: Optional[str] = None


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    user: UserPublic
