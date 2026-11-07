import pytest
from app.models.session import Session, SessionPhase, StudioScenario


def test_session_default_phase_and_durations():
    session = Session(
        id="test-phase-sess",
        audience_group="senior",
        learning_duration_minutes=20,
        testing_duration_minutes=10,
    )
    assert session.phase == SessionPhase.LEARNING
    assert session.phase_timer_seconds == 1200
    assert session.phase_timer_running is False
    assert session.learning_duration_minutes == 20
    assert session.testing_duration_minutes == 10


def test_studio_scenario_educational_attributes():
    scenario = StudioScenario(
        id="scen-edu-1",
        author="Nieznany numer",
        title="Oszustwo na wnuczka",
        content="Babciu, miałem wypadek, pilnie potrzebuję 5000 zł!",
        educational_goal="Nauczyć rozpoznawania fałszywych próśb o pilne pieniądze",
        manipulation_technique="Wywieranie presji czasu i strachu o bliskich",
        learning_points=[
            "Zawsze rozłącz się i zadzwoń bezpośrednio do wnuczka",
            "Nigdy nie przekazuj gotówki kurierom ani obcym osobom",
        ],
        red_flags=["Nieznany numer telefonu", "Naglący ton i zakaz mówienia rodzicom"],
        is_authentic=False,
    )
    assert scenario.educational_goal.startswith("Nauczyć")
    assert "presji czasu" in scenario.manipulation_technique
    assert len(scenario.learning_points) == 2
    assert len(scenario.red_flags) == 2


def test_session_phase_transitions():
    session = Session(id="test-phase-trans", audience_group="kids")
    assert session.phase == SessionPhase.LEARNING
    session.phase = SessionPhase.TESTING
    session.phase_timer_seconds = 600
    session.phase_timer_running = True
    assert session.phase == SessionPhase.TESTING
    assert session.phase_timer_seconds == 600
    assert session.phase_timer_running is True
