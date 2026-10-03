# backend/app/api/v1/progress.py
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException

from app.api.v1.auth import get_current_active_user
from app.models.progress import ModuleCompletionRequest, UserProgress
from app.models.user import User, UserRoleType
from app.services.progress_service import progress_service
from app.services.user_service import user_service

router = APIRouter(prefix="/users", tags=["progress"])


@router.get("/{user_id}/progress", response_model=UserProgress)
def get_user_progress(
    user_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve user progress, total points, badges, and completed modules."""
    # Players can view their own progress; Admins can view any player's progress
    if current_user.role != UserRoleType.ADMIN and current_user.id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot inspect progress of another user.",
        )

    target_user = user_service.get_user_by_id(user_id)
    cohort_id = target_user.cohort_id if target_user else "cohort_cyber_defense_2026"
    return progress_service.get_user_progress(user_id, cohort_id)


@router.post("/{user_id}/modules/{module_id}/complete", response_model=UserProgress)
def complete_module(
    user_id: str,
    module_id: str,
    req: ModuleCompletionRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Record module drill completion, evaluate score against cohort config, award points, and sync passport."""
    if current_user.role != UserRoleType.ADMIN and current_user.id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot record module completion for another user.",
        )

    # Ensure module_id matches request
    req.module_id = module_id
    updated_progress = progress_service.complete_module(user_id, req)
    return updated_progress
