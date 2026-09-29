import math
from typing import Dict, List, Optional
import numpy as np

from app.models.session import SimulationMetrics, SessionStatus
from app.models.feed import FeedItem
from app.engine.network_graph import AudienceNetwork


def calculate_metrics(
    network: AudienceNetwork,
    current_shares: int = 0,
    previous_virality: float = 0.0,
    feed_items: Optional[List[FeedItem]] = None,
    decay_factor: float = 0.65
) -> SimulationMetrics:
    """
    Computes macro aggregated indices strictly bounded between [0.0, 100.0].
    """
    n = network.num_nodes
    if n == 0:
        return SimulationMetrics()

    nodes = list(network.nodes.values())

    # 1. Platform / Institutional Trust Index: T_t = 100 * (1/N) * sum(T_i)
    trust_values = [node.trust for node in nodes]
    avg_trust = float(np.mean(trust_values))
    institutional_trust = float(np.clip(avg_trust * 100.0, 0.0, 100.0))

    # 2. Polarization Score: P_t = 100 * sqrt( (1/N) * sum((B_i - mean(B))^2) )
    biases = [node.ideological_bias for node in nodes]
    std_bias = float(np.std(biases))
    # Bias is in [-1, 1], maximum possible standard deviation is 1.0 (all at -1 and 1)
    polarization_score = float(np.clip(std_bias * 100.0, 0.0, 100.0))

    # 3. Virality Index: V_t = 100 * (Total Reshares / N) * lambda_decay + prev * (1 - lambda)
    instant_virality = (current_shares / max(1, n)) * 100.0 * 2.5
    virality_index = float(np.clip(instant_virality * (1.0 - decay_factor) + previous_virality * decay_factor, 0.0, 100.0))

    # 4. Disinformation Reach: % of nodes exposed to at least one uncorrected disinfo post
    disinfo_item_ids = {item.id for item in (feed_items or []) if not item.is_debunked}
    if disinfo_item_ids:
        nodes_exposed = sum(
            1 for node in nodes if any(pid in disinfo_item_ids for pid in node.exposed_posts)
        )
        disinfo_reach = float(np.clip((nodes_exposed / n) * 100.0, 0.0, 100.0))
    else:
        disinfo_reach = 0.0

    # 5. Debunk Effectiveness: Ratio of prebunk-shielded / debunking nodes
    shielded_or_debunking = sum(
        1 for node in nodes if node.prebunk_shield > 0.3 or node.state.value == "DEBUNKING"
    )
    debunk_effectiveness = float(np.clip((shielded_or_debunking / n) * 100.0, 0.0, 100.0))

    return SimulationMetrics(
        virality_index=round(virality_index, 2),
        polarization_score=round(polarization_score, 2),
        institutional_trust=round(institutional_trust, 2),
        disinformation_reach=round(disinfo_reach, 2),
        debunk_effectiveness=round(debunk_effectiveness, 2)
    )


def evaluate_victory_condition(metrics: SimulationMetrics, current_tick: int, max_ticks: int = 40) -> Optional[Dict[str, str]]:
    """
    Evaluates scenario conclusion & victory conditions.
    Adversary Decisive Victory: Institutional Trust < 20.0 OR Polarization > 85.0
    Defense Decisive Victory: Disinformation Reach < 15.0 and Platform Trust > 75.0 at tick >= 30
    Contested Stalemate: At max ticks.
    """
    if metrics.institutional_trust < 20.0 or metrics.polarization_score > 85.0:
        return {
            "winner": "RED_TEAM",
            "condition": "ADVERSARY_DECISIVE_VICTORY",
            "message": "Information ecosystem collapsed. Polarization exceeded critical threshold or institutional trust eroded below 20%."
        }

    if current_tick >= 30 and metrics.disinformation_reach < 15.0 and metrics.institutional_trust > 75.0:
        return {
            "winner": "BLUE_TEAM",
            "condition": "DEFENSE_DECISIVE_VICTORY",
            "message": "Information defenses held. Disinformation reach contained under 15% with high platform trust."
        }

    if current_tick >= max_ticks:
        if metrics.institutional_trust >= 55.0 and metrics.polarization_score <= 50.0:
            winner = "BLUE_TEAM"
        elif metrics.institutional_trust < 50.0 or metrics.polarization_score > 60.0:
            winner = "RED_TEAM"
        else:
            winner = "DRAW"

        return {
            "winner": winner,
            "condition": "CONTESTED_STALEMATE",
            "message": f"Scenario ended after {max_ticks} ticks. Comparative score determined final outcome."
        }

    return None
