import time
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.session import Session, SessionStatus, UserRole
from app.models.action import ActionType, PlayerAction
from app.services.firestore_service import FirestoreService
from app.engine.simulation_orchestrator import SimulationOrchestrator

router = APIRouter(prefix="/admin", tags=["admin"])


class EmergencyInjectRequest(BaseModel):
    statement: Optional[str] = None
    institution: Optional[str] = None
    severity: Optional[str] = "HIGH"


class RebalanceUserRequest(BaseModel):
    user_id: str
    new_role: UserRole


@router.get("/sessions/{session_id}/presence")
def get_participant_presence(session_id: str):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    now = time.time()
    participants = []
    for uid, player in session.players.items():
        is_active = (now - player.last_heartbeat) < 60
        participants.append({
            "user_id": player.user_id,
            "role": player.role,
            "handle": player.handle,
            "last_heartbeat": player.last_heartbeat,
            "seconds_since_last_seen": int(now - player.last_heartbeat),
            "is_active": is_active
        })

    return {
        "session_id": session_id,
        "total_connected": len(participants),
        "active_connected": sum(1 for p in participants if p["is_active"]),
        "participants": participants
    }


@router.get("/sessions/{session_id}/telemetry")
def get_session_telemetry(session_id: str):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    orchestrator = SimulationOrchestrator.get_instance(session_id)
    cluster_metrics = orchestrator.network.get_cluster_metrics()

    return {
        "session_id": session_id,
        "current_tick": session.current_tick,
        "metrics": session.metrics,
        "token_usage": session.token_usage,
        "cluster_metrics": cluster_metrics,
        "history": session.history_metrics
    }


@router.post("/sessions/{session_id}/force-tick")
def force_tick(session_id: str):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    orchestrator = SimulationOrchestrator.get_instance(session_id)
    updated_session = orchestrator.step_tick(session)
    fs.save_session(updated_session)

    return {
        "message": f"Advanced to tick {updated_session.current_tick}",
        "session": updated_session
    }


@router.post("/sessions/{session_id}/inject")
def trigger_crisis_inject(session_id: str, req: EmergencyInjectRequest):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    orchestrator = SimulationOrchestrator.get_instance(session_id)
    # Queue CRISIS_INJECT action
    inject_action = PlayerAction(
        id=f"inject-{int(time.time())}",
        session_id=session_id,
        user_id="facilitator_admin",
        team=UserRole.FACILITATOR,
        action_type=ActionType.CRISIS_INJECT,
        content=req.statement,
        tick=session.current_tick
    )
    orchestrator.queue_action(inject_action)
    updated_session = orchestrator.step_tick(session)
    fs.save_session(updated_session)

    return {
        "message": "Emergency crisis inject triggered successfully",
        "current_tick": updated_session.current_tick
    }


@router.post("/sessions/{session_id}/rebalance")
def rebalance_participant(session_id: str, req: RebalanceUserRequest):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if req.user_id not in session.players:
        raise HTTPException(status_code=404, detail="Participant not found")

    session.players[req.user_id].role = req.new_role
    fs.save_session(session)

    return {
        "message": f"Updated role for {req.user_id} to {req.new_role}",
        "player": session.players[req.user_id]
    }
