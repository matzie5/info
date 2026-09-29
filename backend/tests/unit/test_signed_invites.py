import time
import pytest
from app.services.auth_service import AuthService
from app.models.session import UserRole


def test_create_and_verify_invite_token():
    auth = AuthService(secret="test-secret-key-12345")
    token = auth.create_invite_token(
        session_id="session-xyz-123",
        role=UserRole.RED_TEAM,
        team_quota=10,
        validity_hours=2
    )
    assert token is not None

    payload = auth.verify_invite_token(token)
    assert payload is not None
    assert payload["sessionId"] == "session-xyz-123"
    assert payload["role"] == UserRole.RED_TEAM.value
    assert payload["teamQuota"] == 10


def test_expired_invite_token():
    auth = AuthService(secret="test-secret-key-12345")
    # Expired token (negative validity)
    token = auth.create_invite_token(
        session_id="session-xyz-123",
        role=UserRole.BLUE_TEAM,
        validity_hours=-1
    )
    payload = auth.verify_invite_token(token)
    assert payload is None


def test_generate_guest_handles():
    auth = AuthService()
    uid_red, handle_red = auth.generate_guest_handle(UserRole.RED_TEAM)
    assert uid_red.startswith("guest_red_team_")
    assert handle_red.startswith("Operative_Red_")

    uid_blue, handle_blue = auth.generate_guest_handle(UserRole.BLUE_TEAM)
    assert uid_blue.startswith("guest_blue_team_")
    assert handle_blue.startswith("Defender_Blue_")
