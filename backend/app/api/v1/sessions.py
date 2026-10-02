import uuid
import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.session import Session, SessionStatus, UserRole
from app.services.firestore_service import FirestoreService
from app.services.cloud_tasks_service import cloud_tasks_service

router = APIRouter(prefix="/sessions", tags=["sessions"])

class CreateSessionRequest(BaseModel):
    title: Optional[str] = "Poland Power Grid Panic 2026"
    scenario_id: Optional[str] = "poland-grid-panic-2026"
    language: Optional[str] = "en"
    max_ticks: Optional[int] = 40

@router.post("", response_model=Session)
def create_session(req: CreateSessionRequest):
    session_id = f"session-{uuid.uuid4().hex[:8]}"
    session = Session(
        id=session_id,
        title=req.title or "Poland Power Grid Panic 2026",
        scenario_id=req.scenario_id or "poland-grid-panic-2026",
        language=req.language or "en",
        max_ticks=req.max_ticks or 40,
        status=SessionStatus.LOBBY
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

