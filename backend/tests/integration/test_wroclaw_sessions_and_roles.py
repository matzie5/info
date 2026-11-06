import pytest
from fastapi.testclient import TestClient
from app.main import app, seed_wroclaw_sessions
from app.services.firestore_service import FirestoreService

@pytest.fixture(autouse=True)
def setup_test_db():
    fs = FirestoreService.get_instance()
    fs.in_memory = True
    seed_wroclaw_sessions()

def test_wroclaw_pre_seeded_sessions():
    with TestClient(app) as client:
        # Check that GET /api/v1/sessions lists both Wrocław pre-seeded sessions
        resp = client.get("/api/v1/sessions")
        assert resp.status_code == 200
        sessions = resp.json()
        ids = [s["id"] for s in sessions]
        assert "WROC-SENIOR-2026" in ids
        assert "WROC-KIDS-2026" in ids

        # Inspect senior session
        senior_sess = next(s for s in sessions if s["id"] == "WROC-SENIOR-2026")
        assert senior_sess["audience_mode"] == "seniors"
        assert senior_sess["location_name"] == "Wrocław"
        assert senior_sess["language"] == "pl"
        assert len(senior_sess["scenarios"]) >= 3
        platform_mocks = [sc["platform_mock"] for sc in senior_sess["scenarios"]]
        assert "WHATSAPP" in platform_mocks
        assert "BROWSER" in platform_mocks
        assert "FACEBOOK" in platform_mocks

        # Inspect kids session
        kids_sess = next(s for s in sessions if s["id"] == "WROC-KIDS-2026")
        assert kids_sess["audience_mode"] == "kids"
        assert kids_sess["location_name"] == "Wrocław"
        assert kids_sess["language"] == "pl"
        assert len(kids_sess["scenarios"]) >= 3
        platform_mocks_kids = [sc["platform_mock"] for sc in kids_sess["scenarios"]]
        assert "TIKTOK" in platform_mocks_kids
        assert "YOUTUBE" in platform_mocks_kids

def test_studio_propose_scenarios_wroclaw():
    with TestClient(app) as client:
        # Propose for seniors in Wrocław
        res = client.post("/api/v1/studio/propose-scenarios", json={
            "location_name": "Wrocław",
            "audience_mode": "seniors",
            "language": "pl"
        })
        assert res.status_code == 200
        data = res.json()
        assert len(data["scenarios"]) >= 3
        assert any("grunwald" in sc["content"].lower() or "grunwald" in sc["title"].lower() for sc in data["scenarios"])

        # Propose for kids in Wrocław
        res_kids = client.post("/api/v1/studio/propose-scenarios", json={
            "location_name": "Wrocław",
            "audience_mode": "kids",
            "language": "pl"
        })
        assert res_kids.status_code == 200
        data_kids = res_kids.json()
        assert any("TIKTOK" == sc["platform_mock"] for sc in data_kids["scenarios"])
        assert any("magnolia" in sc["title"].lower() or "robux" in sc["title"].lower() for sc in data_kids["scenarios"])

def test_studio_add_participant_and_broadcast_hint():
    with TestClient(app) as client:
        # Add participant with language override
        res = client.post("/api/v1/sessions/WROC-SENIOR-2026/participants", json={
            "username": "senior_jan",
            "display_name": "Jan Kowalski",
            "password": "",
            "ui_language_override": "pl"
        })
        assert res.status_code == 200
        sess = res.json()
        assert "senior_jan" in sess["roster"]
        assert sess["roster"]["senior_jan"]["ui_language_override"] == "pl"

        # Trainer broadcasts a hint
        hint_res = client.post("/api/v1/sessions/WROC-SENIOR-2026/broadcast-hint", json={
            "text": "Pamiętajcie o złotej zasadzie: zadzwoń do wnuka na znany numer!",
            "urgency": "HINT"
        })
        assert hint_res.status_code == 200
        updated_sess = hint_res.json()
        assert len(updated_sess["broadcast_hints"]) >= 1
        assert "złotej zasadzie" in updated_sess["broadcast_hints"][-1]["text"]

def test_participant_submit_verdict():
    with TestClient(app) as client:
        res = client.post("/api/v1/sessions/WROC-SENIOR-2026/submit-verdict", json={
            "username": "senior_marta",
            "scenario_id": "wroc-sen-whatsapp-grandchild",
            "flagged_elements": ["Obcy numer", "Presja czasu", "Żądanie BLIK"],
            "verdict": "SCAM",
            "rationale": "Głos brzmi dziwnie, a wnuk nigdy nie pisał z takiego numeru."
        })
        assert res.status_code == 200
        sess = res.json()
        assert len(sess["submissions"]) >= 1
        assert sess["submissions"][-1]["verdict"] == "SCAM"
        assert "wroc-sen-whatsapp-grandchild" in sess["roster"]["senior_marta"]["completed_scenarios"]
        assert sess["roster"]["senior_marta"]["score"] > 0

def test_admin_and_studio_google_media_generation():
    with TestClient(app) as client:
        # 1. Admin generate audio speech (Google Cloud Text-to-Speech)
        res_audio = client.post("/api/v1/admin/media/generate", json={
            "media_type": "AUDIO",
            "prompt_or_text": "Babciu, pilnie potrzebuję kaucji na komisariacie we Wrocławiu!",
            "language": "pl",
            "voice_persona": "grandchild_distress",
            "session_id": "WROC-SENIOR-2026"
        })
        assert res_audio.status_code == 200
        audio_data = res_audio.json()
        assert audio_data["media_type"] == "AUDIO"
        assert audio_data["provider"] == "google-cloud-texttospeech"
        assert audio_data["media_url"].startswith("/assets/audio/")
        assert audio_data["file_size_bytes"] > 0
        assert audio_data["status"] in ["LIVE_CLOUD_GENERATED", "OFFLINE_SIMULATED"]

        # 2. Admin generate image (Google Vertex AI Imagen 3)
        res_img = client.post("/api/v1/admin/media/generate", json={
            "media_type": "IMAGE",
            "prompt_or_text": "Awaria wodociągowa na placu Grunwaldzkim we Wrocławiu, żółta taśma ostrzegawcza",
            "aspect_ratio": "16:9",
            "scenario_title": "Awaria MPWiK Wrocław"
        })
        assert res_img.status_code == 200
        img_data = res_img.json()
        assert img_data["media_type"] == "IMAGE"
        assert img_data["provider"] == "google-vertex-imagen"
        assert img_data["media_url"].startswith("/assets/images/")
        assert img_data["file_size_bytes"] > 0
        assert img_data["status"] in ["LIVE_CLOUD_GENERATED", "OFFLINE_SIMULATED"]

        # 3. Studio generate media endpoint
        res_studio = client.post("/api/v1/studio/generate-media", json={
            "media_type": "AUDIO",
            "prompt_or_text": "Pilny komunikat o zamknięciu szkół we Wrocławiu!",
            "language": "pl",
            "voice_persona": "authority_mayor"
        })
        assert res_studio.status_code == 200
        studio_data = res_studio.json()
        assert studio_data["media_type"] == "AUDIO"
        assert studio_data["provider"] == "google-cloud-texttospeech"
