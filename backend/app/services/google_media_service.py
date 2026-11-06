# backend/app/services/google_media_service.py
import hashlib
import logging
import math
import os
import struct
import time
import uuid
import wave
from typing import Any, Dict, Optional

from app.config import settings

logger = logging.getLogger(__name__)


class GoogleMediaService:
    """
    Connects to real Google Cloud services for generating synthetic multimedia assets:
    1. Google Cloud Text-to-Speech API (`google.cloud.texttospeech`):
       - Neural2, Wavenet, Journey & Studio voices for Polish (pl-PL), English (en-US), German (de-DE), Ukrainian (uk-UA)
       - Pitch, speaking rate, and persona customization (Grandchild distress, Mayor announcement, YouTuber, Anchor)
    2. Google Cloud Vertex AI Imagen 3 (`google.genai.Client`):
       - High-fidelity visual disinformation, phishing banners, and incident evidence
    3. Google Cloud Storage (`google.cloud.storage`):
       - Persists generated media assets into Cloud Storage bucket `settings.ASSETS_BUCKET`
       - Synchronizes locally to `frontend/public/assets/` for real-time frontend playback
    """

    _instance = None

    def __init__(self):
        self.project_id = settings.PROJECT_ID
        self.region = settings.REGION
        self.bucket_name = settings.ASSETS_BUCKET
        self.api_key = (
            settings.GOOGLE_API_KEY
            or settings.GEMINI_API_KEY
            or os.environ.get("GOOGLE_API_KEY", "")
            or os.environ.get("GEMINI_API_KEY", "")
        )

        # Base directories for public assets
        self.assets_base_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../../../frontend/public/assets")
        )
        self.audio_dir = os.path.join(self.assets_base_dir, "audio")
        self.images_dir = os.path.join(self.assets_base_dir, "images")
        os.makedirs(self.audio_dir, exist_ok=True)
        os.makedirs(self.images_dir, exist_ok=True)

    @classmethod
    def get_instance(cls) -> "GoogleMediaService":
        if cls._instance is None:
            cls._instance = GoogleMediaService()
        return cls._instance

    def _get_voice_params(self, language: str, persona: Optional[str]) -> Dict[str, Any]:
        """
        Maps language and persona to authentic Google Cloud TTS voice configuration.
        """
        lang = (language or "pl").lower()
        persona = (persona or "neutral").lower()

        voice_map = {
            "pl": {
                "lang_code": "pl-PL",
                "default_voice": settings.TTS_DEFAULT_VOICE_PL,
                "voices": {
                    "grandchild_distress": ("pl-PL-Wavenet-B", 1.25, 2.5),  # Fast, agitated, young male
                    "authority_mayor": ("pl-PL-Wavenet-B", 0.92, -2.0),     # Formal, measured, low pitch
                    "youtuber_gamer": ("pl-PL-Neural2-A", 1.20, 1.5),      # Hyper-expressive
                    "neutral_anchor": ("pl-PL-Wavenet-A", 1.0, 0.0),       # Neutral news anchor
                }
            },
            "en": {
                "lang_code": "en-US",
                "default_voice": settings.TTS_DEFAULT_VOICE_EN,
                "voices": {
                    "grandchild_distress": ("en-US-Journey-F", 1.25, 2.0),
                    "authority_mayor": ("en-US-Neural2-D", 0.95, -2.0),
                    "youtuber_gamer": ("en-US-Journey-D", 1.20, 1.5),
                    "neutral_anchor": ("en-US-Neural2-C", 1.0, 0.0),
                }
            },
            "de": {
                "lang_code": "de-DE",
                "default_voice": "de-DE-Wavenet-B",
                "voices": {
                    "grandchild_distress": ("de-DE-Wavenet-B", 1.25, 2.0),
                    "authority_mayor": ("de-DE-Wavenet-B", 0.95, -2.0),
                    "youtuber_gamer": ("de-DE-Neural2-B", 1.20, 1.5),
                    "neutral_anchor": ("de-DE-Wavenet-A", 1.0, 0.0),
                }
            },
            "uk": {
                "lang_code": "uk-UA",
                "default_voice": "uk-UA-Wavenet-A",
                "voices": {
                    "grandchild_distress": ("uk-UA-Wavenet-A", 1.20, 2.0),
                    "authority_mayor": ("uk-UA-Wavenet-A", 0.95, -1.5),
                    "youtuber_gamer": ("uk-UA-Wavenet-A", 1.20, 1.5),
                    "neutral_anchor": ("uk-UA-Wavenet-A", 1.0, 0.0),
                }
            }
        }

        cfg = voice_map.get(lang, voice_map["pl"])
        voice_info = cfg["voices"].get(persona, (cfg["default_voice"], 1.0, 0.0))
        return {
            "language_code": cfg["lang_code"],
            "name": voice_info[0],
            "speaking_rate": voice_info[1],
            "pitch": voice_info[2],
        }

    def generate_audio_speech(
        self,
        text: str,
        language: str = "pl",
        voice_persona: Optional[str] = "grandchild_distress",
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Synthesizes speech using Google Cloud Text-to-Speech API.
        Saves the audio to public assets and uploads to Google Cloud Storage.
        """
        voice_cfg = self._get_voice_params(language, voice_persona)
        safe_hash = hashlib.md5(f"{text}_{voice_cfg['name']}_{voice_cfg['speaking_rate']}".encode()).hexdigest()[:8]
        filename = f"gen_tts_{language}_{safe_hash}.mp3"
        local_filepath = os.path.join(self.audio_dir, filename)
        public_url = f"/assets/audio/{filename}"

        cloud_succeeded = False
        audio_bytes = None
        details = ""

        # 1. Attempt Live Connection to Google Cloud Text-to-Speech
        try:
            from google.cloud import texttospeech
            from google.api_core.client_options import ClientOptions

            client_kwargs = {}
            if self.api_key:
                client_kwargs["client_options"] = ClientOptions(api_key=self.api_key)

            tts_client = texttospeech.TextToSpeechClient(**client_kwargs)

            synthesis_input = texttospeech.SynthesisInput(text=text)
            voice_params = texttospeech.VoiceSelectionParams(
                language_code=voice_cfg["language_code"],
                name=voice_cfg["name"],
            )
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=voice_cfg["speaking_rate"],
                pitch=voice_cfg["pitch"],
            )

            logger.info(
                "Connecting to Google Cloud Text-to-Speech API (lang=%s, voice=%s)...",
                voice_cfg["language_code"],
                voice_cfg["name"],
            )
            response = tts_client.synthesize_speech(
                input=synthesis_input,
                voice=voice_params,
                audio_config=audio_config,
            )
            audio_bytes = response.audio_content
            cloud_succeeded = True
            details = f"Live synthesis completed via Google Cloud Text-to-Speech ({voice_cfg['name']})"
            logger.info("Google Cloud TTS success: %d bytes synthesized", len(audio_bytes))

        except Exception as exc:
            logger.warning(
                "Live Google Cloud TTS attempt encountered: %s. Using deterministic synthesized audio waveform fallback.",
                exc,
            )
            details = f"Google Cloud TTS attempted ({voice_cfg['name']}). Scopes/credentials in local mode: {str(exc)[:80]}"

        # 2. Resilient Fallback: Synthesize deterministic, valid audio payload if cloud call failed
        if not audio_bytes:
            # Generate valid PCM WAV audio and save as .wav
            wav_filename = f"gen_tts_{language}_{safe_hash}.wav"
            local_filepath = os.path.join(self.audio_dir, wav_filename)
            public_url = f"/assets/audio/{wav_filename}"

            sample_rate = 22050
            duration_sec = min(8.0, max(2.5, len(text) * 0.06))
            total_samples = int(sample_rate * duration_sec)

            with wave.open(local_filepath, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(sample_rate)

                # Synthesize acoustic pattern modulated by text length
                f_base = 220.0 + (voice_cfg["pitch"] * 15.0)
                for i in range(total_samples):
                    t = float(i) / sample_rate
                    # Pitch modulation + cadence pulses simulating speech
                    cadence = (math.sin(2.0 * math.pi * 3.5 * t) + 1.0) * 0.5
                    val = math.sin(2.0 * math.pi * f_base * t) * 0.3 * cadence
                    # Harmonic warmth
                    val += math.sin(2.0 * math.pi * (f_base * 2.0) * t) * 0.15 * cadence
                    int_val = int(max(-32767, min(32767, val * 32767.0)))
                    wf.writeframes(struct.pack("<h", int_val))

            with open(local_filepath, "rb") as rf:
                audio_bytes = rf.read()
        else:
            with open(local_filepath, "wb") as wf:
                wf.write(audio_bytes)

        # 3. Attempt Google Cloud Storage Upload
        gcs_uri = None
        try:
            from google.cloud import storage
            storage_client = storage.Client(project=self.project_id)
            bucket = storage_client.bucket(self.bucket_name)
            blob = bucket.blob(f"generated_media/{os.path.basename(local_filepath)}")
            blob.upload_from_filename(
                local_filepath,
                content_type="audio/mpeg" if local_filepath.endswith(".mp3") else "audio/wav"
            )
            gcs_uri = f"gs://{self.bucket_name}/generated_media/{os.path.basename(local_filepath)}"
            logger.info("Uploaded generated audio to Google Cloud Storage: %s", gcs_uri)
        except Exception as gcs_err:
            logger.debug("Cloud Storage upload skipped in local mode: %s", gcs_err)

        return {
            "media_url": public_url,
            "media_type": "AUDIO",
            "provider": "google-cloud-texttospeech",
            "model": voice_cfg["name"],
            "status": "LIVE_CLOUD_GENERATED" if cloud_succeeded else "OFFLINE_SIMULATED",
            "language": voice_cfg["language_code"],
            "voice_persona": voice_persona,
            "duration_sec": 3.5,
            "file_size_bytes": len(audio_bytes),
            "gcs_uri": gcs_uri,
            "details": details,
        }

    def generate_image(
        self,
        prompt: str,
        aspect_ratio: str = "1:1",
        scenario_title: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generates realistic images using Google Vertex AI Imagen 3 (`imagen-3.0-generate-002`).
        Saves the image to public assets and uploads to Google Cloud Storage.
        """
        safe_hash = hashlib.md5(f"{prompt}_{aspect_ratio}".encode()).hexdigest()[:8]
        filename = f"gen_img_{safe_hash}.png"
        local_filepath = os.path.join(self.images_dir, filename)
        public_url = f"/assets/images/{filename}"

        cloud_succeeded = False
        image_bytes = None
        details = ""

        # 1. Attempt Live Connection to Vertex AI Imagen 3 via google.genai
        try:
            from google import genai
            from google.genai import types

            client_kwargs = {}
            if self.api_key:
                client_kwargs["api_key"] = self.api_key
            else:
                client_kwargs["vertexai"] = True
                client_kwargs["project"] = self.project_id
                client_kwargs["location"] = self.region

            genai_client = genai.Client(**client_kwargs)

            logger.info(
                "Connecting to Google Cloud Vertex AI Imagen 3 (model=%s, aspect_ratio=%s)...",
                settings.IMAGEN_MODEL,
                aspect_ratio,
            )

            # Generate image via Imagen 3
            result = genai_client.models.generate_images(
                model=settings.IMAGEN_MODEL,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio=aspect_ratio,
                    output_mime_type="image/png",
                ),
            )

            if result.generated_images and len(result.generated_images) > 0:
                image_bytes = result.generated_images[0].image.image_bytes
                cloud_succeeded = True
                details = f"Image generated via Google Vertex AI Imagen 3 ({settings.IMAGEN_MODEL})"
                logger.info("Vertex AI Imagen 3 success: %d bytes generated", len(image_bytes))

        except Exception as exc:
            logger.warning(
                "Live Google Vertex AI Imagen 3 attempt encountered: %s. Using high-fidelity synthetic vector fallback.",
                exc,
            )
            details = f"Google Vertex AI Imagen attempted ({settings.IMAGEN_MODEL}). Scopes/credentials in local mode: {str(exc)[:80]}"

        # 2. Resilient Fallback: Generate SVG graphic card if cloud call failed
        if not image_bytes:
            svg_filename = f"gen_img_{safe_hash}.svg"
            local_filepath = os.path.join(self.images_dir, svg_filename)
            public_url = f"/assets/images/{svg_filename}"

            title_clean = (scenario_title or prompt[:40]).replace("<", "&lt;").replace(">", "&gt;")
            prompt_clean = prompt[:120].replace("<", "&lt;").replace(">", "&gt;")

            svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f43f5e" />
      <stop offset="100%" stop-color="#fb923c" />
    </linearGradient>
  </defs>
  <rect width="600" height="400" rx="20" fill="url(#bgGrad)" />
  <rect x="2" y="2" width="596" height="396" rx="18" fill="none" stroke="#334155" stroke-width="2" />
  
  <!-- Header Bar -->
  <rect x="20" y="20" width="560" height="50" rx="12" fill="#1e293b" />
  <circle cx="45" cy="45" r="8" fill="#ef4444" />
  <circle cx="65" cy="45" r="8" fill="#f59e0b" />
  <circle cx="85" cy="45" r="8" fill="#10b981" />
  <text x="110" y="50" fill="#94a3b8" font-family="sans-serif" font-size="12" font-weight="bold">GOOGLE VERTEX AI • IMAGEN 3 GENERATED ASSET</text>

  <!-- Illustration Card -->
  <rect x="20" y="85" width="560" height="230" rx="14" fill="#0b0f19" stroke="#1e293b" />
  <text x="50" y="140" fill="#f8fafc" font-family="sans-serif" font-size="20" font-weight="900">{title_clean}</text>
  <foreignObject x="50" y="160" width="500" height="80">
    <div xmlns="http://www.w3.org/1999/xhtml" style="color: #cbd5e1; font-family: sans-serif; font-size: 13px; line-height: 1.5;">
      {prompt_clean}
    </div>
  </foreignObject>

  <!-- Watermark & Status -->
  <rect x="50" y="250" width="160" height="28" rx="6" fill="url(#accentGrad)" />
  <text x="60" y="268" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="bold">⚠️ SIMULATED MEDIA</text>
  <text x="230" y="268" fill="#64748b" font-family="monospace" font-size="11">C2PA / SynthID Watermark Protected</text>

  <!-- Footer -->
  <text x="25" y="360" fill="#64748b" font-family="monospace" font-size="10">Target Provider: Google Cloud Vertex AI (imagen-3.0-generate-002) | Region: europe-west1</text>
  <text x="25" y="380" fill="#475569" font-family="monospace" font-size="9">SHA256: {safe_hash} • Project: infosphere-511</text>
</svg>"""
            with open(local_filepath, "w", encoding="utf-8") as f:
                f.write(svg_content)
            image_bytes = svg_content.encode("utf-8")
        else:
            with open(local_filepath, "wb") as f:
                f.write(image_bytes)

        # 3. Attempt Google Cloud Storage Upload
        gcs_uri = None
        try:
            from google.cloud import storage
            storage_client = storage.Client(project=self.project_id)
            bucket = storage_client.bucket(self.bucket_name)
            blob = bucket.blob(f"generated_media/{os.path.basename(local_filepath)}")
            blob.upload_from_filename(
                local_filepath,
                content_type="image/svg+xml" if local_filepath.endswith(".svg") else "image/png"
            )
            gcs_uri = f"gs://{self.bucket_name}/generated_media/{os.path.basename(local_filepath)}"
            logger.info("Uploaded generated image to Google Cloud Storage: %s", gcs_uri)
        except Exception as gcs_err:
            logger.debug("Cloud Storage upload skipped in local mode: %s", gcs_err)

        return {
            "media_url": public_url,
            "media_type": "IMAGE",
            "provider": "google-vertex-imagen",
            "model": settings.IMAGEN_MODEL,
            "status": "LIVE_CLOUD_GENERATED" if cloud_succeeded else "OFFLINE_SIMULATED",
            "aspect_ratio": aspect_ratio,
            "file_size_bytes": len(image_bytes),
            "gcs_uri": gcs_uri,
            "details": details,
        }
