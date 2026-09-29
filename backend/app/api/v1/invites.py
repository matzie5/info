from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.models.session import UserRole, SessionStatus
from app.services.firestore_service import FirestoreService
from app.services.auth_service import auth_service

router = APIRouter(prefix="/sessions", tags=["invites"])

class CreateInviteRequest(BaseModel):
    role: UserRole
    team_quota: int = 25
    validity_hours: int = 24

class CreateInviteResponse(BaseModel):
    token: str
    join_url_path: str
    role: UserRole
    session_id: str

class JoinByTokenRequest(BaseModel):
    token: str

class JoinByTokenResponse(BaseModel):
    firebase_custom_token: str
    session_id: str
    assigned_role: UserRole
    assigned_handle: str
    session_status: SessionStatus

class HeartbeatRequest(BaseModel):
    user_id: str
    role: UserRole
    handle: str

@router.post("/{session_id}/invites", response_model=CreateInviteResponse)
def create_invite(session_id: str, req: CreateInviteRequest):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    token = auth_service.create_invite_token(
        session_id=session_id,
        role=req.role,
        team_quota=req.team_quota,
        validity_hours=req.validity_hours
    )
    return CreateInviteResponse(
        token=token,
        join_url_path=f"/join?token={token}",
        role=req.role,
        session_id=session_id
    )

@router.post("/{session_id}/join-by-token", response_model=JoinByTokenResponse)
def join_by_token(session_id: str, req: JoinByTokenRequest):
    payload = auth_service.verify_invite_token(req.token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired invite token")

    if payload.get("sessionId") != session_id:
        raise HTTPException(status_code=400, detail="Token mismatch with session")

    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    role = UserRole(payload["role"])
    user_id, handle = auth_service.generate_guest_handle(role)
    custom_token = auth_service.create_firebase_custom_token(user_id, session_id, role)

    # Register initial presence
    fs.register_heartbeat(session_id, user_id, role, handle)

    return JoinByTokenResponse(
        firebase_custom_token=custom_token,
        session_id=session_id,
        assigned_role=role,
        assigned_handle=handle,
        session_status=session.status
    )

@router.post("/{session_id}/heartbeat")
def heartbeat(session_id: str, req: HeartbeatRequest):
    fs = FirestoreService.get_instance()
    session = fs.register_heartbeat(session_id, req.user_id, req.role, req.handle)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "ok", "timestamp": session.updated_at}
