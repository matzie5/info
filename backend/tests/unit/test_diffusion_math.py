import pytest
from app.engine.network_graph import AudienceNetwork
from app.engine.metrics_calculator import calculate_metrics, evaluate_victory_condition
from app.models.feed import FeedItem
from app.models.session import SimulationMetrics


def test_metrics_remain_bounded_over_100_ticks():
    network = AudienceNetwork(num_nodes=200, seed=42)
    disinfo_post = FeedItem(
        id="test_post_blackout",
        session_id="session-test",
        author_name="Fake Alert",
        author_handle="@fake",
        author_avatar="",
        content="Extreme blackout warning",
        outrage_score=0.95,
        bias_score=0.80,
        is_amplified=True
    )
    feed = [disinfo_post]
    virality = 0.0

    for tick in range(100):
        new_shares = network.propagate_tick(feed)
        shares_count = sum(new_shares.values())
        metrics = calculate_metrics(
            network=network,
            current_shares=shares_count,
            previous_virality=virality,
            feed_items=feed
        )
        virality = metrics.virality_index

        assert 0.0 <= metrics.virality_index <= 100.0, f"Virality out of bounds at tick {tick}: {metrics.virality_index}"
        assert 0.0 <= metrics.polarization_score <= 100.0, f"Polarization out of bounds at tick {tick}: {metrics.polarization_score}"
        assert 0.0 <= metrics.institutional_trust <= 100.0, f"Trust out of bounds at tick {tick}: {metrics.institutional_trust}"
        assert 0.0 <= metrics.disinformation_reach <= 100.0, f"Disinformation reach out of bounds at tick {tick}: {metrics.disinformation_reach}"
        assert 0.0 <= metrics.debunk_effectiveness <= 100.0, f"Debunk effectiveness out of bounds at tick {tick}: {metrics.debunk_effectiveness}"


def test_victory_condition_adversary():
    # Trust eroded below 20
    metrics = SimulationMetrics(
        institutional_trust=18.5,
        polarization_score=60.0
    )
    victory = evaluate_victory_condition(metrics, current_tick=15)
    assert victory is not None
    assert victory["winner"] == "RED_TEAM"
    assert victory["condition"] == "ADVERSARY_DECISIVE_VICTORY"


def test_victory_condition_defense():
    # At tick 32, low disinfo reach, high trust
    metrics = SimulationMetrics(
        institutional_trust=82.0,
        disinformation_reach=12.0
    )
    victory = evaluate_victory_condition(metrics, current_tick=32)
    assert victory is not None
    assert victory["winner"] == "BLUE_TEAM"
    assert victory["condition"] == "DEFENSE_DECISIVE_VICTORY"
