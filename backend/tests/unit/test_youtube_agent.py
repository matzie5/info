# backend/tests/unit/test_youtube_agent.py
import pytest
from app.services.youtube_agent_service import YouTubeAgentService, youtube_agent
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_extract_youtube_id():
    service = YouTubeAgentService.get_instance()
    assert service.extract_youtube_id("https://www.youtube.com/watch?v=8aQ6JpW9p10") == "8aQ6JpW9p10"
    assert service.extract_youtube_id("https://youtu.be/M7lc1UVf-VE") == "M7lc1UVf-VE"
    assert service.extract_youtube_id("https://www.youtube.com/embed/5qap5aO4i9A") == "5qap5aO4i9A"
    assert service.extract_youtube_id("https://www.youtube.com/shorts/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert service.extract_youtube_id("dQw4w9WgXcQ") == "dQw4w9WgXcQ"


def test_suggest_videos_seniors():
    service = YouTubeAgentService.get_instance()
    res = service.suggest_videos(topic="oszustwa na wnuczka i fałszywe inwestycje", audience_mode="seniors", location_name="Wrocław")
    assert res.audience_mode == "seniors"
    assert len(res.suggestions) >= 2
    # Check that both authentic and deceptive suggestions are present
    has_authentic = any(s.is_authentic for s in res.suggestions)
    has_scam = any(not s.is_authentic for s in res.suggestions)
    assert has_authentic is True
    assert has_scam is True


def test_suggest_videos_kids():
    service = YouTubeAgentService.get_instance()
    res = service.suggest_videos(topic="gaming darmowe robuxy i szkoła", audience_mode="kids", location_name="Wrocław")
    assert res.audience_mode == "kids"
    assert len(res.suggestions) >= 2
    has_authentic = any(s.is_authentic for s in res.suggestions)
    has_scam = any(not s.is_authentic for s in res.suggestions)
    assert has_authentic is True
    assert has_scam is True


def test_create_scenario_from_youtube_known():
    service = YouTubeAgentService.get_instance()
    scenario = service.create_scenario_from_youtube(
        youtube_url_or_id="https://www.youtube.com/watch?v=8aQ6JpW9p10",
        audience_mode="seniors",
        location_name="Wrocław"
    )
    assert scenario.platform_mock == "YOUTUBE"
    assert scenario.is_authentic is True
    assert "8aQ6JpW9p10" in scenario.media_url
    assert scenario.media_type == "VIDEO"
    assert len(scenario.red_flags) >= 3


def test_api_suggest_youtube_videos_endpoint():
    resp = client.post("/api/v1/studio/suggest-youtube-videos", json={
        "topic": "cyberbezpieczeństwo dla seniorów",
        "audience_mode": "seniors",
        "location_name": "Wrocław",
        "language": "pl"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "suggestions" in data
    assert len(data["suggestions"]) > 0


def test_api_create_youtube_scenario_endpoint():
    resp = client.post("/api/v1/studio/create-youtube-scenario", json={
        "youtube_url_or_id": "https://youtu.be/M7lc1UVf-VE",
        "title": "Nierealne zyski finansowe",
        "is_authentic": False,
        "audience_mode": "seniors",
        "location_name": "Wrocław"
    })
    assert resp.status_code == 200
    scenario = resp.json()
    assert scenario["platform_mock"] == "YOUTUBE"
    assert scenario["is_authentic"] is False
    assert "M7lc1UVf-VE" in scenario["media_url"]
