# backend/tests/integration/test_platform_modules.py
from fastapi.testclient import TestClient
from app.main import app
from app.platform.passport_service import passport_service

client = TestClient(app)


def test_platform_registers_all_five_modules():
    passport_service._store.pop("eval_user", None)
    res = client.get("/api/v1/platform/modules")
    assert res.status_code == 200
    body = res.json()
    assert body["vertex_ai_adc_enabled"] is True
    module_ids = [m["module_id"] for m in body["modules"]]
    assert module_ids == [
        "m1_disinfo",
        "m2_scam_lab",
        "m3_deepfake_lab",
        "m4_osint_exposure",
        "m5_algo_echo",
    ]


def test_m2_scam_lab_supports_deepseek_and_adk_tools():
    drill_res = client.post(
        "/api/v1/modules/m2-scam/drills",
        json={
            "user_id": "eval_user",
            "scenario_id": "bec-ceo-wire-2026",
            "operative_model": "deepseek/deepseek-chat",
        },
    )
    assert drill_res.status_code == 200
    drill_id = drill_res.json()["drill_id"]

    turn_res = client.post(
        "/api/v1/modules/m2-scam/drills/turn",
        json={
            "drill_id": drill_id,
            "user_message": "I refuse to wire funds without out-of-band callback verification; DMARC failed.",
            "invoke_tools": ["inspect_headers", "lookup_whois", "out_of_band_callback"],
        },
    )
    assert turn_res.status_code == 200
    data = turn_res.json()
    assert data["adk_agent_config"]["provider_auth_mode"] == "deepseek_api_key_litellm"
    assert data["coach_evaluation"]["resilience_score"] >= 85.0
    assert "ENISA-BEC-2026-01" in data["coach_evaluation"]["grounded_citations"]


def test_m3_deepfake_lab_sequential_agent_forensics():
    res = client.post(
        "/api/v1/modules/m3-deepfake/inspect",
        json={
            "user_id": "eval_user",
            "sample_id": "deepfake-grid-minister-video",
            "user_verdict_is_synthetic": True,
            "user_spotted_markers": ["corneal reflection", "lip-sync lag"],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["is_synthetic_verdict"] is True
    assert body["synthid_detected"] is True
    assert "C2PA-SPEC-2.1" in body["citations"]


def test_m4_osint_exposure_dlp_redaction():
    res = client.post(
        "/api/v1/modules/m4-osint/analyze",
        json={
            "user_id": "eval_user",
            "public_bio_and_posts": (
                "Email: anna@pse.pl, Phone: +48 600 100 200, "
                "GPS: 52.2297° N, 21.0122° E, IBAN: PL61 1090 1014 0000 0712 1981 2874"
            ),
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["total_redactions"] >= 4
    assert "[REDACTED_EMAIL]" in body["dlp_remediated_profile"]
    assert "[REDACTED_IBAN]" in body["dlp_remediated_profile"]


def test_m5_echo_chamber_entropy_shift_and_passport_aggregation():
    outrage_res = client.post(
        "/api/v1/modules/m5-echo/simulate-feed",
        json={
            "user_id": "eval_user",
            "w_outrage": 0.95,
            "w_affinity": 0.80,
            "w_bridging_diversity": 0.05,
        },
    ).json()
    assert outrage_res["polarization_drift_alert"] is True

    bridging_res = client.post(
        "/api/v1/modules/m5-echo/simulate-feed",
        json={
            "user_id": "eval_user",
            "w_outrage": 0.05,
            "w_affinity": 0.20,
            "w_bridging_diversity": 0.95,
        },
    ).json()
    assert bridging_res["polarization_drift_alert"] is False
    assert bridging_res["shannon_viewpoint_entropy"] >= outrage_res["shannon_viewpoint_entropy"]

    passport = client.get("/api/v1/platform/passport/eval_user").json()
    assert passport["overall_hygiene_index"] > 70.0
    assert passport["dimensions"]["m2_scam_lab"]["completed_exercises"] == 1
    assert passport["dimensions"]["m5_algo_echo"]["completed_exercises"] == 2
