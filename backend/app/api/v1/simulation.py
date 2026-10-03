import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.models.session import SessionStatus
from app.services.firestore_service import FirestoreService
from app.services.cloud_tasks_service import cloud_tasks_service
from app.services.auth_service import verify_oidc_tick_token
from app.engine.simulation_orchestrator import SimulationOrchestrator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sessions", tags=["simulation"])

class TickRequest(BaseModel):
    session_id: str

@router.post("/{session_id}/tick")
def process_tick(session_id: str, _: bool = Depends(verify_oidc_tick_token)):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != SessionStatus.ACTIVE:
        logger.info("Session %s is %s; halting tick loop.", session_id, session.status)
        return {"status": session.status, "current_tick": session.current_tick}

    # Verify active player presence for Scale-to-Zero
    # If no players have heartbeat within 60s, automatically pause and stop enqueuing
    has_active = fs.has_active_players(session_id, threshold_seconds=60)
    if not has_active and len(session.players) > 0:
        logger.info("No active player heartbeats for session %s; pausing simulation clock.", session_id)
        session.status = SessionStatus.PAUSED
        fs.save_session(session)
        return {"status": "PAUSED", "reason": "inactivity", "current_tick": session.current_tick}

    # Advance simulation tick
    orchestrator = SimulationOrchestrator.get_instance(session_id)
    session = orchestrator.step_tick(session)
    fs.save_session(session)

    # Schedule subsequent tick if still active and not completed
    if session.status == SessionStatus.ACTIVE:
        cloud_tasks_service.enqueue_tick(session_id, delay_seconds=session.time_per_tick_seconds)

    return {
        "status": session.status,
        "current_tick": session.current_tick,
        "metrics": session.metrics,
        "budgets": session.budgets
    }
