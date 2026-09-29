import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.session import UserRole, SessionStatus
from app.models.action import ActionType
from app.models.node import DemographicCluster

client = TestClient(app)

def test_full_scenario_e2e_flow():
    # 1. Create exercise session
    res = client.post("/api/v1/sessions", json={
        "title": "E2E Strategic Cyber Exercise",
        "scenario_id": "poland-grid-panic-2026",
        "language": "pl",
        "max_ticks": 40
    })
    assert res.status_code == 200
    session_data = res.json()
    sess_id = session_data["id"]
    assert session_data["status"] == SessionStatus.LOBBY.value

    # 2. Join via invite link / token
    inv_res = client.post(f"/api/v1/sessions/{sess_id}/invites", json={
        "role": UserRole.RED_TEAM.value,
        "team_quota": 5
    })
    assert inv_res.status_code == 200
    token = inv_res.json()["token"]

    join_res = client.post(f"/api/v1/sessions/{sess_id}/join-by-token", json={
        "token": token,
        "requested_handle": "GhostRed"
    })
    assert join_res.status_code == 200
    assert join_res.json()["assigned_role"] == UserRole.RED_TEAM.value

    # 3. Facilitator starts the session
    start_res = client.post(f"/api/v1/sessions/{sess_id}/start")
    assert start_res.status_code == 200
    assert start_res.json()["status"] == SessionStatus.ACTIVE.value

    # 4. Read initial feed
    feed_res = client.get(f"/api/v1/sessions/{sess_id}/feed")
    assert feed_res.status_code == 200
    feed = feed_res.json()
    assert len(feed) > 0
    target_post = feed[0]

    # 5. Red Team deploys Bot Swarm
    red_action = client.post(f"/api/v1/sessions/{sess_id}/actions", json={
        "user_id": "GhostRed",
        "team": UserRole.RED_TEAM.value,
        "action_type": ActionType.DEPLOY_BOT_SWARM.value,
        "target_post_id": target_post["id"]
    })
    assert red_action.status_code == 200

    # 6. Blue Team deploys Prebunk Campaign & Evidence Debunk
    blue_prebunk = client.post(f"/api/v1/sessions/{sess_id}/actions", json={
        "user_id": "DefenderOne",
        "team": UserRole.BLUE_TEAM.value,
        "action_type": ActionType.PREBUNK_CAMPAIGN.value,
        "target_cluster": DemographicCluster.SUSCEPTIBLE_NEUTRALS.value
    })
    assert blue_prebunk.status_code == 200

    blue_debunk = client.post(f"/api/v1/sessions/{sess_id}/actions", json={
        "user_id": "DefenderOne",
        "team": UserRole.BLUE_TEAM.value,
        "action_type": ActionType.EVIDENCE_DEBUNK.value,
        "target_post_id": target_post["id"]
    })
    assert blue_debunk.status_code == 200

    # 7. Facilitator advances tick
    tick_res = client.post(f"/api/v1/admin/sessions/{sess_id}/force-tick")
    assert tick_res.status_code == 200
    res_data = tick_res.json()
    assert res_data["session"]["current_tick"] == 1

    # 8. Verify Feed updates & Post-Tick metrics
    updated_feed_res = client.get(f"/api/v1/sessions/{sess_id}/feed")
    assert updated_feed_res.status_code == 200
    updated_feed = updated_feed_res.json()

    # The target post should be debunked and amplified
    matched_post = next(p for p in updated_feed if p["id"] == target_post["id"])
    assert matched_post["is_debunked"] is True
    assert matched_post["fact_check_label"] is not None
    assert matched_post["is_amplified"] is True

    # 9. Verify Telemetry & Presence
    pres_res = client.get(f"/api/v1/admin/sessions/{sess_id}/presence")
    assert pres_res.status_code == 200
    assert len(pres_res.json()["participants"]) >= 1

    tel_res = client.get(f"/api/v1/admin/sessions/{sess_id}/telemetry")
    assert tel_res.status_code == 200
    assert "cluster_metrics" in tel_res.json()
