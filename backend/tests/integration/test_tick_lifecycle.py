import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.session import SessionStatus, UserRole
from app.models.action import ActionType
from app.services.firestore_service import FirestoreService


@pytest.fixture
def client():
    return TestClient(app)


def test_session_lifecycle_and_tick(client):
    # 1. Create Session
    create_resp = client.post("/api/v1/sessions", json={
        "title": "Integration Test Session",
        "scenario_id": "poland-grid-panic-2026",
        "language": "en"
    })
    assert create_resp.status_code == 200
    session_data = create_resp.json()
    session_id = session_data["id"]
    assert session_data["status"] == SessionStatus.LOBBY.value

    # 2. Join via token
    invite_resp = client.post(f"/api/v1/sessions/{session_id}/invites", json={
        "role": UserRole.RED_TEAM.value,
        "team_quota": 5
    })
    assert invite_resp.status_code == 200
    token = invite_resp.json()["token"]

    join_resp = client.post(f"/api/v1/sessions/{session_id}/join-by-token", json={
        "token": token
    })
    assert join_resp.status_code == 200
    user_id = join_resp.json()["assigned_handle"]

    # 3. Start Session
    start_resp = client.post(f"/api/v1/sessions/{session_id}/start")
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == SessionStatus.ACTIVE.value

    # 4. Submit an action
    action_resp = client.post(f"/api/v1/sessions/{session_id}/actions", json={
        "user_id": user_id,
        "team": UserRole.RED_TEAM.value,
        "action_type": ActionType.AI_DEEPFAKE_ARTICLE.value,
        "custom_prompt": "Emergency substation explosion"
    })
    assert action_resp.status_code == 200

    # 5. Process tick
    tick_resp = client.post(f"/api/v1/sessions/{session_id}/tick")
    assert tick_resp.status_code == 200
    tick_data = tick_resp.json()
    assert tick_data["status"] == SessionStatus.ACTIVE.value
    assert tick_data["current_tick"] == 1
    assert "metrics" in tick_data

    # 6. Check feed has items
    feed_resp = client.get(f"/api/v1/sessions/{session_id}/feed")
    assert feed_resp.status_code == 200
    feed_items = feed_resp.json()
    assert len(feed_items) >= 2  # Seed post + deepfake post


def test_scale_to_zero_auto_pause(client):
    # Create session with an inactive player
    create_resp = client.post("/api/v1/sessions", json={"title": "Auto Pause Test"})
    session_id = create_resp.json()["id"]

    # Start session
    client.post(f"/api/v1/sessions/{session_id}/start")

    # Manually backdate player heartbeat to 120s ago
    fs = FirestoreService.get_instance()
    session = fs.get_session(session_id)
    session.players["ghost_user"] = {
        "user_id": "ghost_user",
        "role": UserRole.RED_TEAM,
        "handle": "Ghost",
        "last_heartbeat": time.time() - 120,
        "is_active": False
    }
    fs.save_session(session)

    # Process tick - should pause because no active players exist (<60s)
    tick_resp = client.post(f"/api/v1/sessions/{session_id}/tick")
    assert tick_resp.status_code == 200
    data = tick_resp.json()
    assert data["status"] == "PAUSED"
    assert data.get("reason") == "inactivity"
