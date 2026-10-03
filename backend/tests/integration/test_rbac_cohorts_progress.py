# backend/tests/integration/test_rbac_cohorts_progress.py
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import UserRoleType
from app.services.cohort_service import cohort_service
from app.services.progress_service import progress_service
from app.services.user_service import user_service


@pytest.fixture
def client():
    return TestClient(app)


def get_auth_header(client: TestClient, username: str, password: str) -> dict:
    resp = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_auth_login_and_demo_users(client: TestClient):
    # 1. Check demo users endpoint
    demo_resp = client.get("/api/v1/auth/demo-users")
    assert demo_resp.status_code == 200
    accounts = demo_resp.json()["demo_accounts"]
    usernames = [a["username"] for a in accounts]
    assert "admin" in usernames
    assert "player1" in usernames

    # 2. Login as admin
    admin_login = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    assert admin_login.status_code == 200
    admin_data = admin_login.json()
    assert admin_data["user"]["role"] == "ADMIN"
    assert "access_token" in admin_data

    # 3. Login with invalid password
    bad_login = client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrongpassword"})
    assert bad_login.status_code == 401

    # 4. Verify /me endpoint
    headers = {"Authorization": f"Bearer {admin_data['access_token']}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "admin"


def test_role_separation_admin_vs_player(client: TestClient):
    admin_headers = get_auth_header(client, "admin", "admin123")
    player_headers = get_auth_header(client, "player1", "player123")

    # Player attempts to create cohort -> Must be 403 Forbidden
    forbidden_resp = client.post(
        "/api/v1/cohorts",
        headers=player_headers,
        json={"id": "rogue_cohort", "name": "Unauthorized Cohort"},
    )
    assert forbidden_resp.status_code == 403
    assert "Administrative privileges required" in forbidden_resp.json()["detail"]

    # Admin creates cohort -> 201 Created
    cohort_id = f"test_cohort_secops_{id(client)}"
    created_resp = client.post(
        "/api/v1/cohorts",
        headers=admin_headers,
        json={
            "id": cohort_id,
            "name": "SecOps Trainee Cohort",
            "description": "Specialized defense cohort",
        },
    )
    assert created_resp.status_code == 201
    assert created_resp.json()["id"] == cohort_id


def test_admin_configures_cohort_play_parameters(client: TestClient):
    admin_headers = get_auth_header(client, "admin", "admin123")
    cohort_id = "cohort_cyber_defense_2026"

    # Fetch initial configuration
    get_resp = client.get(f"/api/v1/cohorts/{cohort_id}", headers=admin_headers)
    assert get_resp.status_code == 200
    cohort = get_resp.json()
    assert "m2_scam_lab" in cohort["module_configs"]

    # Admin updates configuration: raise M2 pass score to 85.0 and points to 200
    update_resp = client.put(
        f"/api/v1/cohorts/{cohort_id}/config",
        headers=admin_headers,
        json={
            "module_configs": {
                "m2_scam_lab": {
                    "enabled": True,
                    "pass_score": 85.0,
                    "points_reward": 200,
                    "parameters": {"allowed_models": ["gemini-2.5-flash", "deepseek/deepseek-chat"]},
                }
            }
        },
    )
    assert update_resp.status_code == 200
    updated_cfg = update_resp.json()["module_configs"]["m2_scam_lab"]
    assert updated_cfg["pass_score"] == 85.0
    assert updated_cfg["points_reward"] == 200


def test_player_completes_module_and_earns_points(client: TestClient):
    player_headers = get_auth_header(client, "player1", "player123")
    user_id = "user_player1"

    # Get initial progress
    initial_prog = client.get(f"/api/v1/users/{user_id}/progress", headers=player_headers).json()
    initial_pts = initial_prog["total_points"]

    # Player completes M3 Deepfake Lab with 94.0 score
    comp_resp = client.post(
        f"/api/v1/users/{user_id}/modules/m3_deepfake_lab/complete",
        headers=player_headers,
        json={
            "module_id": "m3_deepfake_lab",
            "score": 94.0,
            "takeaway": "Detected audio synthesis artifacts and verified C2PA manifest.",
        },
    )
    assert comp_resp.status_code == 200
    prog = comp_resp.json()
    assert prog["total_points"] >= initial_pts + 150
    assert "m3_deepfake_lab" in prog["completed_modules"]
    assert "SYNTHID_FORENSIC" in prog["badges"]

    # Check Passport sync
    passport_resp = client.get(f"/api/v1/platform/passport/{user_id}")
    assert passport_resp.status_code == 200
    passport = passport_resp.json()
    assert passport["dimensions"]["m3_deepfake_lab"]["score"] == 94.0


def test_cohort_analytics_and_leaderboard(client: TestClient):
    player_headers = get_auth_header(client, "player1", "player123")
    cohort_id = "cohort_cyber_defense_2026"

    # Check leaderboard
    lb_resp = client.get(f"/api/v1/cohorts/{cohort_id}/leaderboard", headers=player_headers)
    assert lb_resp.status_code == 200
    leaderboard = lb_resp.json()
    assert len(leaderboard) >= 2
    assert leaderboard[0]["rank"] == 1
    assert leaderboard[0]["total_points"] >= leaderboard[1]["total_points"]

    # Check analytics
    analytics_resp = client.get(f"/api/v1/cohorts/{cohort_id}/analytics", headers=player_headers)
    assert analytics_resp.status_code == 200
    analytics = analytics_resp.json()
    assert "module_completion_rates" in analytics
    assert "average_module_scores" in analytics
    assert analytics["total_members"] >= 2
