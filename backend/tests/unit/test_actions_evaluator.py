import pytest
from app.models.session import Session, SessionStatus, UserRole
from app.models.action import PlayerAction, ActionType
from app.models.feed import FeedItem
from app.engine.network_graph import AudienceNetwork
from app.engine.token_governor import TokenGovernor
from app.engine.actions_evaluator import ActionsEvaluator
from app.models.node import DemographicCluster


def test_bot_swarm_action():
    session = Session(id="sess-action-1", language="en")
    network = AudienceNetwork(num_nodes=50)
    post = FeedItem(
        id="post-1",
        session_id=session.id,
        author_name="Alert",
        author_handle="@alert",
        author_avatar="",
        content="Testing post",
        headline="Blackout Alert"
    )
    feed = [post]
    governor = TokenGovernor()
    action = PlayerAction(
        id="act-swarm",
        session_id=session.id,
        user_id="red_user",
        team=UserRole.RED_TEAM,
        action_type=ActionType.DEPLOY_BOT_SWARM,
        target_post_id="post-1"
    )

    updated_feed = ActionsEvaluator.process_actions(
        session=session,
        network=network,
        feed_items=feed,
        pending_actions=[action],
        token_governor=governor
    )
    assert updated_feed[0].is_amplified
    assert updated_feed[0].virality_velocity > 1.0
    assert len(updated_feed[0].comments) >= 3


def test_blue_prebunk_and_debunk():
    session = Session(id="sess-action-2", language="en")
    network = AudienceNetwork(num_nodes=50)
    post = FeedItem(
        id="post-2",
        session_id=session.id,
        author_name="Alert",
        author_handle="@alert",
        author_avatar="",
        content="Testing disinfo post",
        headline="Fake Leak"
    )
    feed = [post]
    governor = TokenGovernor()

    # Prebunk
    prebunk_act = PlayerAction(
        id="act-prebunk",
        session_id=session.id,
        user_id="blue_user",
        team=UserRole.BLUE_TEAM,
        action_type=ActionType.PREBUNK_CAMPAIGN,
        target_cluster=DemographicCluster.SUSCEPTIBLE_NEUTRALS
    )
    # Debunk
    debunk_act = PlayerAction(
        id="act-debunk",
        session_id=session.id,
        user_id="blue_user",
        team=UserRole.BLUE_TEAM,
        action_type=ActionType.EVIDENCE_DEBUNK,
        target_post_id="post-2"
    )

    updated = ActionsEvaluator.process_actions(
        session=session,
        network=network,
        feed_items=feed,
        pending_actions=[prebunk_act, debunk_act],
        token_governor=governor
    )
    assert updated[0].is_debunked
    assert updated[0].fact_check_label is not None
    assert updated[0].debunk_friction >= 0.5


def test_budget_regen_and_cooldown():
    session = Session(id="sess-action-3")
    session.budgets.red_team_capital = 30.0
    session.budgets.blue_team_bandwidth = 20.0
    session.budgets.red_cooldowns = {"DEPLOY_BOT_SWARM": 2}
    session.budgets.blue_cooldowns = {"PREBUNK_CAMPAIGN": 1}

    ActionsEvaluator.regenerate_budgets_and_cooldowns(session)
    assert session.budgets.red_team_capital == 40.0
    assert session.budgets.blue_team_bandwidth == 30.0
    assert session.budgets.red_cooldowns["DEPLOY_BOT_SWARM"] == 1
    assert session.budgets.blue_cooldowns["PREBUNK_CAMPAIGN"] == 0
