import uuid
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
    return session

@router.post("/{session_id}/start", response_model=Session)
def start_session(session_id: str):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = SessionStatus.ACTIVE
    fs.save_session(session)

    # Initialize initial breaking news seed post if feed is empty
    if len(fs.get_feed_items(session_id)) == 0:
        import uuid
        from app.ai.seed_library import SeedLibrary
        from app.models.feed import FeedItem
        seed_art = SeedLibrary.get_article(language=session.language)
        init_item = FeedItem(
            id=f"feed-{uuid.uuid4().hex[:8]}",
            session_id=session_id,
            author_name=seed_art.author_name,
            author_handle=seed_art.author_handle,
            author_avatar="",
            is_verified=True,
            headline=seed_art.headline,
            content=seed_art.body_text,
            media_url=seed_art.media_url,
            outrage_score=seed_art.outrage_score,
            virality_velocity=1.2,
            targeted_clusters=[seed_art.target_cluster] if seed_art.target_cluster else []
        )
        fs.save_feed_item(session_id, init_item)

    # Trigger first tick immediately
    cloud_tasks_service.enqueue_tick(session_id, delay_seconds=0)
    return session

@router.post("/{session_id}/pause", response_model=Session)
def pause_session(session_id: str):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = SessionStatus.PAUSED
    return fs.save_session(session)

@router.post("/{session_id}/resume", response_model=Session)
def resume_session(session_id: str):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = SessionStatus.ACTIVE
    fs.save_session(session)
    cloud_tasks_service.enqueue_tick(session_id, delay_seconds=0)
    return session
