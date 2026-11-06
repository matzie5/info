# backend/app/api/v1/cohorts.py
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.auth import get_current_active_user, require_admin_user
from app.models.cohort import (
    AssignUserCohortRequest,
    Cohort,
    CreateCohortRequest,
    LocationTailoringRequest,
    UpdateCohortConfigRequest,
)
from app.models.user import User, UserRoleType
from app.services.cohort_service import cohort_service
from app.services.progress_service import progress_service

router = APIRouter(prefix="/cohorts", tags=["cohorts"])


@router.get("", response_model=List[Cohort])
def list_cohorts(current_user: User = Depends(get_current_active_user)):
    """List cohorts. Admins see all cohorts; Players see their assigned cohort."""
    cohorts = cohort_service.list_cohorts()
    if current_user.role == UserRoleType.ADMIN:
        return cohorts
    # Filter to player's assigned cohort
    if current_user.cohort_id:
        return [c for c in cohorts if c.id == current_user.cohort_id]
    return cohorts


@router.post("", response_model=Cohort, status_code=status.HTTP_201_CREATED)
def create_cohort(
    req: CreateCohortRequest,
    admin_user: User = Depends(require_admin_user),
):
    """Admin endpoint to create a new cohort."""
    try:
        cohort = cohort_service.create_cohort(req, created_by=admin_user.id)
        return cohort
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{cohort_id}", response_model=Cohort)
def get_cohort(
    cohort_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get cohort details and module play configurations."""
    cohort = cohort_service.get_cohort(cohort_id)
    if not cohort:
        raise HTTPException(status_code=404, detail=f"Cohort '{cohort_id}' not found")
    return cohort


@router.put("/{cohort_id}/config", response_model=Cohort)
def update_cohort_config(
    cohort_id: str,
    req: UpdateCohortConfigRequest,
    admin_user: User = Depends(require_admin_user),
):
    """Admin endpoint to configure module play parameters for a cohort."""
    try:
        updated = cohort_service.update_cohort_config(cohort_id, req)
        return updated
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{cohort_id}/members", response_model=Cohort)
def assign_user_to_cohort(
    cohort_id: str,
    req: AssignUserCohortRequest,
    admin_user: User = Depends(require_admin_user),
):
    """Admin endpoint to enroll a player into a cohort."""
    try:
        updated = cohort_service.assign_user_to_cohort(cohort_id, req.user_id)
        return updated
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{cohort_id}/analytics")
def get_cohort_analytics(
    cohort_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Admin and cohort members can view cohort completion analytics."""
    cohort = cohort_service.get_cohort(cohort_id)
    if not cohort:
        raise HTTPException(status_code=404, detail=f"Cohort '{cohort_id}' not found")
    return progress_service.get_cohort_analytics(cohort_id)


@router.post("/{cohort_id}/tailor-environment", response_model=Cohort)
def tailor_cohort_environment(
    cohort_id: str,
    req: LocationTailoringRequest,
    admin_user: User = Depends(require_admin_user),
):
    """Admin/Trainer endpoint to prepare a cohort session upfront and AI-tailor M1-M5 to a specific city and audience."""
    try:
        return cohort_service.tailor_cohort_environment(cohort_id, req)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{cohort_id}/leaderboard")
def get_cohort_leaderboard(
    cohort_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """View cohort points leaderboard."""
    return progress_service.get_cohort_leaderboard(cohort_id)
