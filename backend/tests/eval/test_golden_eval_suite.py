# backend/tests/eval/test_golden_eval_suite.py
from typing import Any, Dict
import pytest

import app.main  # Triggers registration of all 5 domain modules in platform_registry
from app.platform.plugin_registry import GoldenEvalCase, platform_registry
from app.platform.rag_engine import rag_engine
from app.modules.m2_scam_lab.plugin import (
    m2_plugin,
    StartScamDrillRequest,
    ScamTurnRequest,
)
from app.modules.m3_deepfake_lab.plugin import (
    m3_plugin,
    DeepfakeInspectionRequest,
)
from app.modules.m4_osint_exposure.plugin import (
    m4_plugin,
    OSINTFootprintSubmission,
)
from app.modules.m5_algo_echo.plugin import (
    m5_plugin,
    RecommenderTuningRequest,
)


def execute_golden_eval_case(case: GoldenEvalCase) -> bool:
    """
    Executes a GoldenEvalCase by dispatching to its corresponding module pipeline
    and running its validator_fn against the execution results.
    """
    if case.module_id == "m1_disinfo":
        query = case.input_payload.get("query", "HVDC grid blackout rumors")
        chunks = rag_engine.retrieve(query=query, module_domain="m1_disinfo", top_k=2)
        return case.validator_fn(chunks)

    elif case.module_id == "m2_scam_lab":
        model = case.input_payload.get("operative_model", "deepseek/deepseek-chat")
        session = m2_plugin.start_drill(
            StartScamDrillRequest(
                user_id="golden_eval_user",
                scenario_id="bec-ceo-wire-2026",
                operative_model=model,
            )
        )
        turn_result = m2_plugin.process_turn(
            ScamTurnRequest(
                drill_id=session.drill_id,
                user_message="I refuse to wire funds without out-of-band callback verification; DMARC failed.",
                invoke_tools=["inspect_headers", "lookup_whois", "out_of_band_callback"],
            )
        )
        return case.validator_fn(turn_result)

    elif case.module_id == "m3_deepfake_lab":
        sample_id = case.input_payload.get("sample_id", "deepfake-grid-minister-video")
        report = m3_plugin.inspect_media(
            DeepfakeInspectionRequest(
                user_id="golden_eval_user",
                sample_id=sample_id,
                user_verdict_is_synthetic=True,
                user_spotted_markers=["corneal reflection", "lip-sync lag"],
            )
        )
        return case.validator_fn(report)

    elif case.module_id == "m4_osint_exposure":
        bio_posts = case.input_payload.get(
            "public_bio_and_posts",
            (
                "Email: anna@pse.pl, Phone: +48 600 100 200, "
                "GPS: 52.2297° N, 21.0122° E, IBAN: PL61 1090 1014 0000 0712 1981 2874"
            ),
        )
        report = m4_plugin.analyze_footprint(
            OSINTFootprintSubmission(
                user_id="golden_eval_user",
                public_bio_and_posts=bio_posts,
            )
        )
        return case.validator_fn(report)

    elif case.module_id == "m5_algo_echo":
        outrage = m5_plugin.simulate_feed(
            RecommenderTuningRequest(
                user_id="golden_eval_user",
                w_outrage=0.95,
                w_affinity=0.80,
                w_bridging_diversity=0.05,
            )
        )
        bridging = m5_plugin.simulate_feed(
            RecommenderTuningRequest(
                user_id="golden_eval_user",
                w_outrage=0.05,
                w_affinity=0.20,
                w_bridging_diversity=0.95,
            )
        )
        return case.validator_fn({"outrage": outrage, "bridging": bridging})

    raise ValueError(f"Unknown module_id for eval case: {case.module_id}")


def test_collect_and_execute_all_golden_eval_cases():
    """
    Collects all golden evaluation test cases from platform_registry.collect_all_eval_cases(),
    executes every registered case, and asserts a 100% pass rate.
    """
    cases = platform_registry.collect_all_eval_cases()
    assert len(cases) == 5, f"Expected 5 golden eval cases, got {len(cases)}"

    expected_modules = {
        "m1_disinfo",
        "m2_scam_lab",
        "m3_deepfake_lab",
        "m4_osint_exposure",
        "m5_algo_echo",
    }
    registered_modules = {c.module_id for c in cases}
    assert registered_modules == expected_modules

    results: Dict[str, bool] = {}
    for case in cases:
        passed = execute_golden_eval_case(case)
        results[case.case_id] = passed
        assert passed is True, f"Golden eval case failed validator: {case.case_id} ({case.description})"

    pass_count = sum(1 for v in results.values() if v)
    pass_rate = (pass_count / len(cases)) * 100.0
    assert pass_rate == 100.0


def test_m1_golden_eval_case_grounding():
    """Unit test for Module 1 golden case: RAG grounding on PSE-GRID-2026-001."""
    cases = [c for c in platform_registry.collect_all_eval_cases() if c.module_id == "m1_disinfo"]
    assert len(cases) == 1
    assert execute_golden_eval_case(cases[0]) is True


def test_m2_golden_eval_case_deepseek_and_adk_tools():
    """Unit test for Module 2 golden case: DeepSeek routing, ADK tools, and ENISA citations."""
    cases = [c for c in platform_registry.collect_all_eval_cases() if c.module_id == "m2_scam_lab"]
    assert len(cases) == 1
    assert execute_golden_eval_case(cases[0]) is True


def test_m3_golden_eval_case_synthid_c2pa():
    """Unit test for Module 3 golden case: SynthID watermark and missing C2PA detection."""
    cases = [c for c in platform_registry.collect_all_eval_cases() if c.module_id == "m3_deepfake_lab"]
    assert len(cases) == 1
    assert execute_golden_eval_case(cases[0]) is True


def test_m4_golden_eval_case_dlp_scrubbing():
    """Unit test for Module 4 golden case: Multi-pattern DLP redaction."""
    cases = [c for c in platform_registry.collect_all_eval_cases() if c.module_id == "m4_osint_exposure"]
    assert len(cases) == 1
    assert execute_golden_eval_case(cases[0]) is True


def test_m5_golden_eval_case_entropy_and_polarization():
    """Unit test for Module 5 golden case: Viewpoint entropy shift and drift alert."""
    cases = [c for c in platform_registry.collect_all_eval_cases() if c.module_id == "m5_algo_echo"]
    assert len(cases) == 1
    assert execute_golden_eval_case(cases[0]) is True


def test_rag_verify_citations_valid_reference():
    """
    Validates rag_engine.verify_citations() correctly validates text citing authorized
    sources such as [PSE-GRID-2026-001].
    """
    retrieved = rag_engine.retrieve(
        query="PSE grid frequency telemetry 50Hz",
        module_domain="m1_disinfo",
        top_k=2,
    )
    assert any(c.source_id == "PSE-GRID-2026-001" for c in retrieved)

    sample_output = (
        "According to official grid telemetry [PSE-GRID-2026-001], the transmission system "
        "is operating synchronously at 50.00 Hz with a 19.4% spinning reserve margin."
    )
    is_valid, cited_ids = rag_engine.verify_citations(sample_output, retrieved)
    assert is_valid is True
    assert cited_ids == ["PSE-GRID-2026-001"]


def test_rag_verify_citations_cert_reference():
    """
    Validates rag_engine.verify_citations() on CERT Polska advisory citations [CERT-PL-2026-114].
    """
    retrieved = rag_engine.retrieve(
        query="Coordinated Inauthentic Behavior Botnet Advisory NASK",
        module_domain="m1_disinfo",
        top_k=2,
    )
    assert any(c.source_id == "CERT-PL-2026-114" for c in retrieved)

    sample_output = (
        "According to the advisory [CERT-PL-2026-114], NASK identifies spoofed news domains "
        "and coordinated bot amplification targeting energy utilities."
    )
    is_valid, cited_ids = rag_engine.verify_citations(sample_output, retrieved)
    assert is_valid is True
    assert cited_ids == ["CERT-PL-2026-114"]


def test_rag_verify_citations_enisa_reference():
    """
    Validates rag_engine.verify_citations() on BEC phishing guidance citations [ENISA-BEC-2026-01].
    """
    retrieved = rag_engine.retrieve(
        query="CEO Fraud Urgent Wire Transfer lookalike domains",
        module_domain="m2_scam",
        top_k=1,
    )
    assert any(c.source_id == "ENISA-BEC-2026-01" for c in retrieved)

    sample_output = (
        "Per advisory [ENISA-BEC-2026-01], mandatory defense requires out-of-band callback "
        "verification on a pre-registered corporate telephone directory number."
    )
    is_valid, cited_ids = rag_engine.verify_citations(sample_output, retrieved)
    assert is_valid is True
    assert cited_ids == ["ENISA-BEC-2026-01"]


def test_rag_verify_citations_hallucinated_citation_rejected():
    """
    Validates rag_engine.verify_citations() rejects hallucinated citations
    not present in the retrieved chunk set.
    """
    retrieved = rag_engine.retrieve(
        query="HVDC reserve margins",
        module_domain="m1_disinfo",
        top_k=2,
    )
    hallucinated_output = (
        "An unconfirmed intelligence report [PSE-LEAK-2026-999] claims total blackout in Warsaw."
    )
    is_valid, cited_ids = rag_engine.verify_citations(hallucinated_output, retrieved)
    assert is_valid is False
    assert cited_ids == []


def test_rag_verify_citations_mixed_citations_rejected():
    """
    Validates rag_engine.verify_citations() rejects outputs that mix a valid citation
    with an unauthorized/hallucinated citation.
    """
    retrieved = rag_engine.retrieve(
        query="HVDC reserve margins",
        module_domain="m1_disinfo",
        top_k=2,
    )
    mixed_output = (
        "While [PSE-GRID-2026-001] claims 50.00 Hz stability, [FABRICATED-2026-007] alleges "
        "widespread transformer malfunctions."
    )
    is_valid, cited_ids = rag_engine.verify_citations(mixed_output, retrieved)
    assert is_valid is False


def test_rag_verify_citations_empty_citations_rejected():
    """
    Validates rag_engine.verify_citations() flags responses that fail to cite any evidence.
    """
    retrieved = rag_engine.retrieve(
        query="HVDC reserve margins",
        module_domain="m1_disinfo",
        top_k=2,
    )
    uncited_output = "The grid is stable and rolling blackouts are not expected."
    is_valid, cited_ids = rag_engine.verify_citations(uncited_output, retrieved)
    assert is_valid is False
    assert cited_ids == []
