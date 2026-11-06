import uuid
import time
import asyncio
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.models.session import (
    Session,
    SessionStatus,
    UserRole,
    StudioScenario,
    StudioParticipant,
    TrainerBroadcast
)
from app.services.firestore_service import FirestoreService
from app.services.cloud_tasks_service import cloud_tasks_service

router = APIRouter(prefix="/sessions", tags=["sessions"])

class CreateSessionRequest(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = "Poland Power Grid Panic 2026"
    scenario_id: Optional[str] = "poland-grid-panic-2026"
    language: Optional[str] = "en"
    audience_mode: Optional[str] = "professional"
    location_name: Optional[str] = None
    max_ticks: Optional[int] = 40
    trainer_token: Optional[str] = None
    scenarios: Optional[List[StudioScenario]] = None
    roster: Optional[Dict[str, StudioParticipant]] = None

@router.get("", response_model=List[Session])
def list_sessions(audience_mode: Optional[str] = None, location_name: Optional[str] = None):
    fs = FirestoreService.get_instance()
    all_sessions = fs.list_sessions()
    if audience_mode:
        all_sessions = [s for s in all_sessions if s.audience_mode == audience_mode]
    if location_name:
        all_sessions = [s for s in all_sessions if s.location_name and location_name.lower() in s.location_name.lower()]
    return all_sessions

@router.post("", response_model=Session)
def create_session(req: CreateSessionRequest):
    session_id = req.id if req.id else f"session-{uuid.uuid4().hex[:8]}"
    session = Session(
        id=session_id,
        title=req.title or "Poland Power Grid Panic 2026",
        scenario_id=req.scenario_id or "poland-grid-panic-2026",
        language=req.language or "en",
        audience_mode=req.audience_mode or "professional",
        location_name=req.location_name,
        max_ticks=req.max_ticks or 40,
        status=SessionStatus.LOBBY,
        trainer_token=req.trainer_token or f"trn-{uuid.uuid4().hex[:6]}",
        scenarios=req.scenarios or [],
        roster=req.roster or {}
    )
    fs = FirestoreService.get_instance()
    return fs.save_session(session)

@router.get("/{session_id}", response_model=Session)
def get_session(session_id: str):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == SessionStatus.ACTIVE:
        _ensure_tick_running(session_id, interval=session.time_per_tick_seconds)
    return session

@router.post("/{session_id}/start", response_model=Session)
async def start_session(session_id: str):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = SessionStatus.ACTIVE
    fs.save_session(session)

    # Initialize initial breaking news seed post if feed is empty
    if len(fs.get_feed_items(session_id)) == 0:
        from app.ai.seed_library import SeedLibrary
        init_item = SeedLibrary.get_scenario_starter_post(
            session.scenario_id, session.language, session_id
        )
        fs.save_feed_item(session_id, init_item)

    # Trigger first tick immediately
    cloud_tasks_service.enqueue_tick(session_id, delay_seconds=0)
    _ensure_tick_running(session_id, interval=session.time_per_tick_seconds)
    return session

@router.post("/{session_id}/pause", response_model=Session)
async def pause_session(session_id: str):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = SessionStatus.PAUSED
    _cancel_tick_running(session_id)
    return fs.save_session(session)

@router.post("/{session_id}/resume", response_model=Session)
async def resume_session(session_id: str):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = SessionStatus.ACTIVE
    fs.save_session(session)
    cloud_tasks_service.enqueue_tick(session_id, delay_seconds=0)
    _ensure_tick_running(session_id, interval=session.time_per_tick_seconds)
    return session


_active_tick_tasks = {}

async def _local_simulation_loop(session_id: str, interval: int = 10):
    import logging
    logger = logging.getLogger("infosphere.clock")
    fs = FirestoreService.get_instance()
    from app.engine.simulation_orchestrator import SimulationOrchestrator
    logger.info("Starting local 10s tick loop for session %s (interval=%ds)", session_id, interval)
    try:
        while True:
            await asyncio.sleep(interval)
            sess = fs.get_session(session_id)
            if not sess or sess.status != SessionStatus.ACTIVE:
                logger.info("Ending tick loop for session %s (status=%s)", session_id, getattr(sess, 'status', None))
                break
            orchestrator = SimulationOrchestrator.get_instance(session_id)
            if orchestrator.check_inactivity_timeout(sess):
                logger.info("Session %s paused due to player inactivity (>60s)", session_id)
                sess.status = SessionStatus.PAUSED
                fs.save_session(sess)
                break
            updated_sess = orchestrator.step_tick(sess)
            fs.save_session(updated_sess)
            logger.info("Auto-tick advanced to T+%d for session %s", updated_sess.current_tick, session_id)
            if updated_sess.status == SessionStatus.COMPLETED:
                logger.info("Session %s reached terminal condition", session_id)
                break
    except asyncio.CancelledError:
        logger.info("Local tick loop cancelled for session %s", session_id)
    except Exception as e:
        logger.error("Error in local tick loop for %s: %s", session_id, e, exc_info=True)
    finally:
        _active_tick_tasks.pop(session_id, None)

class BroadcastHintRequest(BaseModel):
    text: Optional[str] = None
    message: Optional[str] = None
    urgency: Optional[str] = None
    severity: Optional[str] = None

    @property
    def broadcast_text(self) -> str:
        return self.text or self.message or ""

    @property
    def broadcast_urgency(self) -> str:
        return self.urgency or self.severity or "HINT"

@router.post("/{session_id}/broadcast-hint", response_model=Session)
def broadcast_hint(session_id: str, req: BroadcastHintRequest):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    broadcast = TrainerBroadcast(
        id=f"hint-{uuid.uuid4().hex[:6]}",
        text=req.broadcast_text,
        urgency=req.broadcast_urgency
    )
    session.broadcast_hints.append(broadcast)
    return fs.save_session(session)

class AddParticipantRequest(BaseModel):
    username: str
    display_name: Optional[str] = None
    password: Optional[str] = ""
    ui_language_override: Optional[str] = None

@router.post("/{session_id}/participants", response_model=Session)
def add_participant(session_id: str, req: AddParticipantRequest):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    participant = StudioParticipant(
        username=req.username,
        display_name=req.display_name or req.username,
        password=req.password or "",
        ui_language_override=req.ui_language_override
    )
    session.roster[req.username] = participant
    return fs.save_session(session)

class SubmitVerdictRequest(BaseModel):
    username: str
    scenario_id: str
    flagged_elements: List[str] = Field(default_factory=list)
    verdict: str  # "SCAM" | "AUTHENTIC"
    rationale: Optional[str] = None

@router.post("/{session_id}/submit-verdict", response_model=Session)
def submit_verdict(session_id: str, req: SubmitVerdictRequest):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    sub = {
        "id": f"sub-{uuid.uuid4().hex[:6]}",
        "username": req.username,
        "scenario_id": req.scenario_id,
        "flagged_elements": req.flagged_elements,
        "verdict": req.verdict,
        "rationale": req.rationale,
        "timestamp": time.time()
    }
    session.submissions.append(sub)
    if req.username in session.roster:
        p = session.roster[req.username]
        if req.scenario_id not in p.completed_scenarios:
            p.completed_scenarios.append(req.scenario_id)
            p.score += 100
    return fs.save_session(session)

def _ensure_tick_running(session_id: str, interval: int = 10):
    from app.config import settings
    if not settings.SERVICE_URL:
        existing = _active_tick_tasks.get(session_id)
        if not existing or existing.done():
            try:
                loop = asyncio.get_running_loop()
                task = loop.create_task(_local_simulation_loop(session_id, interval))
                _active_tick_tasks[session_id] = task
            except RuntimeError:
                pass

def _cancel_tick_running(session_id: str):
    task = _active_tick_tasks.pop(session_id, None)
    if task and not task.done():
        task.cancel()

