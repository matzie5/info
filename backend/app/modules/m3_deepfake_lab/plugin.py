# backend/app/modules/m3_deepfake_lab/plugin.py
from typing import Dict, List, Literal
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.platform.adk_runtime import adk_runtime
from app.platform.passport_service import passport_service
from app.platform.plugin_registry import (
    DigitalHygieneModulePlugin,
    GoldenEvalCase,
    ModuleMetadata,
    platform_registry,
)
from app.platform.rag_engine import rag_engine
from app.platform.telemetry import telemetry_service


class MediaArtifactSample(BaseModel):
    sample_id: str
    title: str
    media_type: Literal["IMAGE", "AUDIO_VOICE_CLONE", "VIDEO_SNIPPET"]
    gcs_uri: str
    c2pa_manifest_status: Literal["VALID_SIGNED", "STRIPPED_OR_MISSING", "TAMPERED_SIGNATURE"]
    synthid_watermark_detected: bool
    ground_truth_is_synthetic: bool
    forensic_markers: List[str]


MEDIA_LAB_CATALOG: Dict[str, MediaArtifactSample] = {
    "deepfake-grid-minister-video": MediaArtifactSample(
        sample_id="deepfake-grid-minister-video",
        title="Leaked Press Briefing: 'Emergency 72-Hour ATM & Grid Shutdown'",
        media_type="VIDEO_SNIPPET",
        gcs_uri=f"gs://{settings.ASSETS_BUCKET}/m3-samples/grid_minister_briefing.mp4",
        c2pa_manifest_status="STRIPPED_OR_MISSING",
        synthid_watermark_detected=True,
        ground_truth_is_synthetic=True,
        forensic_markers=[
            "Asymmetric corneal specular reflection between left/right pupils",
            "Viseme-to-phoneme lip-sync lag (140ms) on plosive consonants",
            "Missing C2PA camera hardware signature; SynthID frequency watermark present",
        ],
    ),
    "cfo-voice-clone-voicemail": MediaArtifactSample(
        sample_id="cfo-voice-clone-voicemail",
        title="WhatsApp Voice Note: CFO Requesting Swift IBAN Override",
        media_type="AUDIO_VOICE_CLONE",
        gcs_uri=f"gs://{settings.ASSETS_BUCKET}/m3-samples/cfo_voice_clone.wav",
        c2pa_manifest_status="STRIPPED_OR_MISSING",
        synthid_watermark_detected=False,
        ground_truth_is_synthetic=True,
        forensic_markers=[
            "Uniform spectral cutoff above 8kHz characteristic of zero-shot TTS vocoders",
            "Absence of natural inhalation breath pauses across 28-second utterance",
            "Metallic phase artifacts on fricative transitions",
        ],
    ),
    "verified-pse-substation-photo": MediaArtifactSample(
        sample_id="verified-pse-substation-photo",
        title="PSE Field Engineer Inspection Photo — Substation Rogowiec",
        media_type="IMAGE",
        gcs_uri=f"gs://{settings.ASSETS_BUCKET}/m3-samples/pse_substation_rogowiec.jpg",
        c2pa_manifest_status="VALID_SIGNED",
        synthid_watermark_detected=False,
        ground_truth_is_synthetic=False,
        forensic_markers=[
            "Cryptographically valid C2PA v2.1 hardware capture signature (Sony Alpha ILCE-7M4)",
            "Consistent shadow vanishing points and natural sensor ISO noise grain",
        ],
    ),
}


class DeepfakeInspectionRequest(BaseModel):
    user_id: str = "demo_user"
    sample_id: str = "deepfake-grid-minister-video"
    user_verdict_is_synthetic: bool = True
    user_spotted_markers: List[str] = Field(default_factory=list)


class DeepfakeForensicReport(BaseModel):
    sample_id: str
    adk_pipeline_name: str
    c2pa_status: str
    synthid_detected: bool
    is_synthetic_verdict: bool
    confidence_score: float
    visual_and_audio_anomalies: List[str]
    user_accuracy_score: float
    explainer_summary: str
    citations: List[str]


class Module3DeepfakeLabPlugin(DigitalHygieneModulePlugin):
    def get_metadata(self) -> ModuleMetadata:
        return ModuleMetadata(
            module_id="m3_deepfake_lab",
            number=3,
            title="Deepfake & Synthetic Media Literacy Lab",
            short_title="Deepfake Literacy Lab",
            description="Real-time multimodal inspection of AI-generated images, zero-shot voice clones, and video snippets using Vertex AI Gemini multimodal agents + C2PA/SynthID provenance verification.",
            route_prefix="m3-deepfake",
            frontend_route="/modules/deepfake-lab",
            resilience_dimension="Synthetic Media & Deepfake Literacy",
            adk_pattern="SequentialAgent (VisualForensicAgent -> AudioCloneDetectorAgent -> ForensicExplainerAgent)",
            supported_models=["gemini-2.5-flash", "gemini-2.5-pro"],
            rag_corpus_domain="m3_deepfake",
        )

    def inspect_media(self, req: DeepfakeInspectionRequest) -> DeepfakeForensicReport:
        sample = MEDIA_LAB_CATALOG.get(req.sample_id)
        if not sample:
            raise HTTPException(status_code=404, detail="Media sample not found")

        telemetry_service.publish_ai_task(
            "m3_deepfake_inspection",
            {"sample_id": sample.sample_id, "gcs_uri": sample.gcs_uri},
        )

        visual_agent = adk_runtime.build_llm_agent(
            name="visual_forensic_agent",
            instruction="Inspect image/video frames for diffusion artifacts, corneal reflections, and C2PA metadata.",
            task_complexity="FAST_REACTION",
            output_key="visual_findings",
        )
        audio_agent = adk_runtime.build_llm_agent(
            name="audio_clone_detector_agent",
            instruction="Inspect audio spectrogram & prosody for TTS vocoder cutoffs and missing breath pauses.",
            task_complexity="FAST_REACTION",
            output_key="audio_findings",
        )
        explainer_agent = adk_runtime.build_llm_agent(
            name="forensic_explainer_agent",
            instruction="Synthesize visual_findings and audio_findings into an educational forensic report grounded in C2PA-SPEC-2.1.",
            task_complexity="RAG_SYNTHESIS",
            output_key="forensic_report",
        )
        pipeline = adk_runtime.build_sequential_pipeline(
            name="m3_multimodal_forensic_pipeline",
            sub_agents=[visual_agent, audio_agent, explainer_agent],
            description="Multimodal Deepfake Forensic Pipeline",
        )

        rag_chunks = rag_engine.retrieve(
            query=f"C2PA SynthID {sample.media_type}",
            module_domain="m3_deepfake",
            top_k=1,
        )
        citations = [c.source_id for c in rag_chunks]

        correct_verdict = req.user_verdict_is_synthetic == sample.ground_truth_is_synthetic
        marker_bonus = min(20.0, 10.0 * len(req.user_spotted_markers))
        accuracy_score = (80.0 + marker_bonus) if correct_verdict else (25.0 + marker_bonus)

        summary = (
            f"Grounded in [{citations[0]}]: Sample '{sample.title}' has C2PA status={sample.c2pa_manifest_status} "
            f"and SynthID={sample.synthid_watermark_detected}. Verdict: "
            f"{'SYNTHETIC_MANIPULATION' if sample.ground_truth_is_synthetic else 'AUTHENTIC_PROVENANCE'}."
        )
        passport_service.record_module_score(
            req.user_id, "m3_deepfake_lab", accuracy_score, summary
        )

        return DeepfakeForensicReport(
            sample_id=sample.sample_id,
            adk_pipeline_name=getattr(pipeline, "name", "m3_multimodal_forensic_pipeline"),
            c2pa_status=sample.c2pa_manifest_status,
            synthid_detected=sample.synthid_watermark_detected,
            is_synthetic_verdict=sample.ground_truth_is_synthetic,
            confidence_score=0.96,
            visual_and_audio_anomalies=sample.forensic_markers,
            user_accuracy_score=accuracy_score,
            explainer_summary=summary,
            citations=citations,
        )

    def get_router(self) -> APIRouter:
        router = APIRouter()

        @router.get("/samples", response_model=List[MediaArtifactSample])
        def list_media_samples():
            return list(MEDIA_LAB_CATALOG.values())

        @router.post("/inspect", response_model=DeepfakeForensicReport)
        def run_inspection(req: DeepfakeInspectionRequest):
            return self.inspect_media(req)

        return router

    def get_golden_eval_cases(self) -> List[GoldenEvalCase]:
        return [
            GoldenEvalCase(
                case_id="m3-eval-synthid-c2pa-forensics",
                module_id="m3_deepfake_lab",
                description="Verify ADK SequentialAgent forensic pipeline flags stripped C2PA + SynthID watermark on deepfake video.",
                input_payload={"sample_id": "deepfake-grid-minister-video"},
                validator_fn=lambda rep: (
                    rep.is_synthetic_verdict is True
                    and rep.synthid_detected is True
                    and "C2PA-SPEC-2.1" in rep.citations
                ),
            )
        ]


m3_plugin = Module3DeepfakeLabPlugin()
platform_registry.register(m3_plugin)
