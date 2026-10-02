import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.session import UserRole
from app.models.feed import FeedItem
from app.models.node import DemographicCluster
from app.models.action import PlayerAction, ActionType, ActionConfig
from app.services.firestore_service import FirestoreService

router = APIRouter(prefix="/sessions", tags=["actions"])

class SubmitActionRequest(BaseModel):
    user_id: str
    team: UserRole
    action_type: ActionType
    target_post_id: Optional[str] = None
    target_cluster: Optional[DemographicCluster] = None
    custom_prompt: Optional[str] = None
    headline: Optional[str] = None
    content: Optional[str] = None

@router.post("/{session_id}/actions", response_model=PlayerAction)
def submit_action(session_id: str, req: SubmitActionRequest):
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    cost = ActionConfig.COSTS.get(req.action_type, 0.0)

    # Validate budget
    if req.team == UserRole.RED_TEAM:
        if session.budgets.red_team_capital < cost:
            raise HTTPException(status_code=400, detail="Insufficient Red Team Capital")
        session.budgets.red_team_capital -= cost
        session.budgets.red_cooldowns[req.action_type.value] = ActionConfig.COOLDOWNS.get(req.action_type, 1)
    elif req.team == UserRole.BLUE_TEAM:
        if session.budgets.blue_team_bandwidth < cost:
            raise HTTPException(status_code=400, detail="Insufficient Blue Team Bandwidth")
        session.budgets.blue_team_bandwidth -= cost
        session.budgets.blue_cooldowns[req.action_type.value] = ActionConfig.COOLDOWNS.get(req.action_type, 1)

    action = PlayerAction(
        id=f"act-{uuid.uuid4().hex[:8]}",
        session_id=session_id,
        user_id=req.user_id,
        team=req.team,
        action_type=req.action_type,
        target_post_id=req.target_post_id,
        target_cluster=req.target_cluster,
        custom_prompt=req.custom_prompt,
        headline=req.headline,
        content=req.content,
        resource_cost=cost,
        tick=session.current_tick,
        is_processed=True
    )

    from app.engine.simulation_orchestrator import SimulationOrchestrator
    from app.engine.actions_evaluator import ActionsEvaluator
    from app.engine.token_governor import TokenGovernor

    orchestrator = SimulationOrchestrator.get_instance(session_id)
    token_governor = TokenGovernor(session.token_usage)
    current_feed = fs.get_feed_items(session_id)

    # Process action immediately so feed items mutate in real time
    updated_feed = ActionsEvaluator.process_actions(
        session=session,
        network=orchestrator.network,
        feed_items=current_feed,
        pending_actions=[action],
        token_governor=token_governor
    )

    for item in updated_feed:
        fs.save_feed_item(session_id, item)

    session.token_usage = token_governor.to_model()
    fs.record_action(session_id, action)
    fs.save_session(session)

    return action

@router.get("/{session_id}/feed", response_model=List[FeedItem])
def get_feed(session_id: str):
    fs = FirestoreService.get_instance()
    return fs.get_feed_items(session_id)

@router.get("/{session_id}/actions", response_model=List[PlayerAction])
def get_actions(session_id: str):
    fs = FirestoreService.get_instance()
    return fs.get_actions(session_id)

