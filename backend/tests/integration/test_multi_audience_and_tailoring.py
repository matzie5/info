# backend/tests/integration/test_multi_audience_and_tailoring.py
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def get_auth_header(client: TestClient, username: str, password: str) -> dict:
    resp = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_multi_audience_demo_users_and_cohorts(client: TestClient):
    demo_resp = client.get("/api/v1/auth/demo-users")
    assert demo_resp.status_code == 200
    accounts = {a["username"]: a for a in demo_resp.json()["demo_accounts"]}
    assert "kid1" in accounts
    assert accounts["kid1"]["audience_mode"] == "kids"
    assert "senior1" in accounts
    assert accounts["senior1"]["audience_mode"] == "seniors"

    kid_login = client.post("/api/v1/auth/login", json={"username": "kid1", "password": "kid1123"})
    assert kid_login.status_code == 200
    assert kid_login.json()["user"]["audience_mode"] == "kids"

    senior_login = client.post("/api/v1/auth/login", json={"username": "senior1", "password": "senior1123"})
    assert senior_login.status_code == 200
    assert senior_login.json()["user"]["audience_mode"] == "seniors"


def test_trainer_upfront_location_tailoring_wroclaw(client: TestClient):
    admin_headers = get_auth_header(client, "admin", "admin123")
    tailor_resp = client.post(
        "/api/v1/cohorts/cohort_silver_shield_2026/tailor-environment",
        headers=admin_headers,
        json={
            "audience_mode": "seniors",
            "city_name": "Wrocław",
            "language": "pl",
            "local_mayor_or_leader": "Mayor of Wrocław (Prezydent Miasta Wrocławia)",
            "local_water_or_utility": "MPWiK Wrocław",
            "local_official_portal": "wroclaw.pl",
            "local_institution": "Wrocławskie Centrum Seniora",
        },
    )
    assert tailor_resp.status_code == 200, tailor_resp.text
    cohort = tailor_resp.json()
    assert cohort["audience_mode"] == "seniors"
    assert cohort["location_name"] == "Wrocław"
    assert cohort["prepared_session_id"] is not None
    assert cohort["tailored_environment"] is not None
    env = cohort["tailored_environment"]
    assert env["city_name"] == "Wrocław"
    assert "MPWiK Wrocław" in env["local_water_or_utility"]
    assert "Wrocław" in env["m3_sample_title"]

    # Verify the pre-created M1 session is ACTIVE and has a starter post
    prep_session_id = cohort["prepared_session_id"]
    sess_resp = client.get(f"/api/v1/sessions/{prep_session_id}")
    assert sess_resp.status_code == 200
    sess_data = sess_resp.json()
    assert sess_data["status"] == "ACTIVE"
    assert sess_data["audience_mode"] == "seniors"
    assert sess_data["location_name"] == "Wrocław"


def test_m1_through_m5_kids_and_seniors_tracks(client: TestClient):
    # M1: Scenarios include kids, seniors, and Wrocław
    scen_resp = client.get("/api/v1/admin/scenarios")
    assert scen_resp.status_code == 200
    scen_payload = scen_resp.json()
    scen_list = scen_payload["scenarios"] if isinstance(scen_payload, dict) else scen_payload
    scen_ids = [s["id"] for s in scen_list]
    assert "kids-school-snowday-rumor-2026" in scen_ids
    assert "seniors-pension-health-rumor-2026" in scen_ids
    assert "tailored-wroclaw-mpwik-2026" in scen_ids

    # M2: Kids & Seniors scam scenarios
    m2_kids = client.get("/api/v1/modules/m2-scam/scenarios?audience_mode=kids")
    assert m2_kids.status_code == 200
    assert any(s["id"] == "kids-robux-skin-scam-2026" for s in m2_kids.json()["scenarios"])

    drill_resp = client.post(
        "/api/v1/modules/m2-scam/drills",
        json={
            "user_id": "user_senior1",
            "audience_mode": "seniors",
            "scenario_id": "tailored-wroclaw-water-scam-2026",
            "language": "pl",
        },
    )
    assert drill_resp.status_code == 200
    drill_id = drill_resp.json()["drill_id"]
    turn_resp = client.post(
        "/api/v1/modules/m2-scam/drills/turn",
        json={
            "drill_id": drill_id,
            "user_message": "Nie zapłacę gotówką! Rozłączam się i dzwonię na oficjalny numer MPWiK Wrocław 994.",
            "language": "pl",
            "invoke_tools": ["inspect_headers", "out_of_band_callback"],
        },
    )
    assert turn_resp.status_code == 200
    turn_data = turn_resp.json()
    assert turn_data["coach_evaluation"]["resilience_score"] >= 80.0
    assert "Golden Rule" in turn_data["coach_evaluation"]["coach_feedback"]

    # M3: Kids & Seniors deepfake samples
    m3_kids = client.get("/api/v1/modules/m3-deepfake/samples?audience_mode=kids")
    assert m3_kids.status_code == 200
    assert any(s["sample_id"] == "kids-youtuber-giveaway-video" for s in m3_kids.json())

    m3_seniors = client.get("/api/v1/modules/m3-deepfake/samples?audience_mode=seniors")
    assert m3_seniors.status_code == 200
    assert any(s["sample_id"] == "seniors-wroclaw-mayor-deepfake" for s in m3_seniors.json())

    inspect_resp = client.post(
        "/api/v1/modules/m3-deepfake/inspect",
        json={
            "user_id": "user_senior1",
            "sample_id": "seniors-wroclaw-mayor-deepfake",
            "user_verdict_is_synthetic": True,
            "user_spotted_markers": ["lip-sync", "blinking"],
        },
    )
    assert inspect_resp.status_code == 200
    assert inspect_resp.json()["user_accuracy_score"] == 100.0

    # M4: Kids & Seniors OSINT presets and analysis
    m4_kids = client.post(
        "/api/v1/modules/m4-osint/analyze",
        json={
            "user_id": "user_kid1",
            "audience_mode": "kids",
            "public_bio_and_posts": "Leo class 4B email leo@school.pl phone +48 502 998 112 GPS EXIF: 51.1079° N, 17.0385° E",
        },
    )
    assert m4_kids.status_code == 200
    assert "Secret Clue Alert" in m4_kids.json()["simulated_attacker_pretext"]

    # M5: Kids, Seniors, and Wrocław localized Echo Chamber simulation
    m5_wroc = client.post(
        "/api/v1/modules/m5-echo/simulate-feed",
        json={
            "user_id": "user_senior1",
            "audience_mode": "seniors",
            "city_name": "Wrocław",
            "user_interest_query": "MPWiK Wrocław woda seniorzy",
            "w_outrage": 0.15,
            "w_affinity": 0.35,
            "w_bridging_diversity": 0.90,
            "top_k": 4,
        },
    )
    assert m5_wroc.status_code == 200
    m5_data = m5_wroc.json()
    assert any("Wrocław" in p["headline"] or "wroclaw" in p["headline"].lower() for p in m5_data["ranked_feed"])
    assert "Calm Information Advisor" in m5_data["adk_coach_explanation"]
