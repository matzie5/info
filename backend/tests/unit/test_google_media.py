# backend/tests/unit/test_google_media.py
import pytest
from app.services.google_media_service import GoogleMediaService


def test_google_media_service_instance():
    service = GoogleMediaService.get_instance()
    assert service is not None
    assert service.project_id == "infosphere-511"


def test_voice_params_mapping():
    service = GoogleMediaService.get_instance()
    params_seniors = service._get_voice_params("pl", "grandchild_distress")
    assert params_seniors["language_code"] == "pl-PL"
    assert params_seniors["speaking_rate"] > 1.0

    params_mayor = service._get_voice_params("pl", "authority_mayor")
    assert params_mayor["language_code"] == "pl-PL"
    assert params_mayor["speaking_rate"] < 1.0


def test_generate_audio_speech_creates_valid_asset():
    service = GoogleMediaService.get_instance()
    res = service.generate_audio_speech(
        text="Testowy komunikat ostrzegawczy dla mieszkańców Wrocławia.",
        language="pl",
        voice_persona="authority_mayor"
    )
    assert res["media_type"] == "AUDIO"
    assert res["media_url"].startswith("/assets/audio/")
    assert res["file_size_bytes"] > 0
    assert res["status"] in ["LIVE_CLOUD_GENERATED", "OFFLINE_SIMULATED"]


def test_generate_image_creates_valid_asset():
    service = GoogleMediaService.get_instance()
    res = service.generate_image(
        prompt="Skażenie ujęcia wody we Wrocławiu, żółte taśmy ostrzegawcze",
        aspect_ratio="1:1",
        scenario_title="Awaria MPWiK Wrocław"
    )
    assert res["media_type"] == "IMAGE"
    assert res["media_url"].startswith("/assets/images/")
    assert res["file_size_bytes"] > 0
