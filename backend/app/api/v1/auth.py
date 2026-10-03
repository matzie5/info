# backend/app/api/v1/auth.py
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from app.config import settings
from app.models.user import (
    AuthTokenResponse,
    User,
    UserLoginRequest,
    UserPublic,
    UserRegisterRequest,
    UserRoleType,
)
from app.services.user_service import user_service

router = APIRouter(prefix="/auth", tags=["auth"])


def get_current_active_user(
    authorization: Optional[str] = Header(default=None),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        # When auth is not strictly enforced in local dev/tests without headers, fallback to demo player
        if not getattr(settings, "ENFORCE_AUTH", False):
            default_user = user_service.get_user_by_username("player1")
            if default_user:
                return default_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Bearer authentication token",
        )

    token = authorization.split(" ", 1)[1].strip()
    payload = user_service.decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )

    uid = payload.get("sub")
    user = user_service.get_user_by_id(uid) if uid else None
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
        )
    return user


def require_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    if current_user.role != UserRoleType.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access this resource",
        )
    return current_user


@router.post("/register", response_model=AuthTokenResponse)
def register(req: UserRegisterRequest):
    try:
        user = user_service.create_user(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    token = user_service.create_access_token(user)
    return AuthTokenResponse(
        access_token=token,
        token_type="Bearer",
        user=user_service.to_public(user),
    )


@router.post("/login", response_model=AuthTokenResponse)
def login(req: UserLoginRequest):
    user = user_service.authenticate_user(req.username, req.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = user_service.create_access_token(user)
    return AuthTokenResponse(
        access_token=token,
        token_type="Bearer",
        user=user_service.to_public(user),
    )


@router.get("/me", response_model=UserPublic)
def get_me(current_user: User = Depends(get_current_active_user)):
    return user_service.to_public(current_user)


@router.get("/demo-users")
def list_demo_users():
    """Returns available pre-seeded demo user accounts for rapid testing and evaluation."""
    users = user_service.list_users()
    demo_list = []
    for u in users:
        demo_list.append({
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name,
            "email": u.email,
            "role": u.role.value,
            "cohort_id": u.cohort_id,
            "hint_password": f"{u.username}123" if u.username != "admin" else "admin123",
        })
    return {"demo_accounts": demo_list}
