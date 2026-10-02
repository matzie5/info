import time
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.session import Session, SessionStatus, UserRole
from app.models.action import ActionType, PlayerAction
from app.services.firestore_service import FirestoreService
from app.engine.simulation_orchestrator import SimulationOrchestrator

router = APIRouter(prefix="/admin", tags=["admin"])


import uuid
from app.models.feed import FeedItem
from app.ai.seed_library import SeedLibrary

class EmergencyInjectRequest(BaseModel):
    statement: Optional[str] = None
    institution: Optional[str] = None
    severity: Optional[str] = "HIGH"


class RebalanceUserRequest(BaseModel):
    user_id: str
    new_role: UserRole


class AdminCreatePostRequest(BaseModel):
    headline: Optional[str] = None
    content: str
    author_name: Optional[str] = "Centrum Informacji"
    author_handle: Optional[str] = "@CentrumInfo"
    author_avatar: Optional[str] = ""
    media_url: Optional[str] = None
    is_verified: Optional[bool] = False
    outrage_score: Optional[float] = 0.5
    bias_score: Optional[float] = 0.0
    virality_velocity: Optional[float] = 1.0
    target_cluster: Optional[str] = None


@router.get("/scenarios")
def list_scenarios():
    """Returns all pre-configured simulation scenarios."""
    return SeedLibrary.get_scenarios()


@router.get("/sessions/{session_id}/scenario-articles")
def get_scenario_articles(session_id: str):
    """Returns curated inject articles for the current session's scenario and language."""
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    articles = SeedLibrary.get_scenario_articles(session.scenario_id, session.language)
    return articles


@router.post("/sessions/{session_id}/posts", response_model=FeedItem)
def create_admin_post(session_id: str, req: AdminCreatePostRequest):
    """Allows facilitator to inject a new scenario event / breaking post into the live feed."""
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    post_id = f"post_admin_{uuid.uuid4().hex[:6]}"
    feed_item = FeedItem(
        id=post_id,
        session_id=session_id,
        author_name=req.author_name or "Centrum Informacji",
        author_handle=req.author_handle or "@CentrumInfo",
        author_avatar=req.author_avatar or "",
        is_verified=bool(req.is_verified),
        headline=req.headline,
        content=req.content,
        media_url=req.media_url,
        created_at_tick=session.current_tick,
        timestamp=time.time(),
        outrage_score=float(req.outrage_score if req.outrage_score is not None else 0.5),
        bias_score=float(req.bias_score if req.bias_score is not None else 0.0),
        virality_velocity=float(req.virality_velocity if req.virality_velocity is not None else 1.0),
        shares_count=5,
        likes_count=15,
        targeted_clusters=[req.target_cluster] if req.target_cluster else []
    )
    fs.save_feed_item(session_id, feed_item)

    # Record facilitator action
    cluster_val = None
    if req.target_cluster:
        try:
            cluster_val = DemographicCluster(req.target_cluster)
        except Exception:
            cluster_val = None

    action = PlayerAction(
        id=f"act-admin-{uuid.uuid4().hex[:6]}",
        session_id=session_id,
        user_id="facilitator_admin",
        team=UserRole.FACILITATOR,
        action_type=ActionType.CRISIS_INJECT,
        headline=req.headline,
        content=req.content,
        target_post_id=post_id,
        target_cluster=cluster_val,
        resource_cost=0.0,
        tick=session.current_tick,
        is_processed=True
    )
    fs.record_action(session_id, action)

    return feed_item



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
