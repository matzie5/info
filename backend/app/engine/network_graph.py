import math
import random
from typing import Dict, List, Optional, Set
import networkx as nx
import numpy as np

from app.models.node import AudienceNode, DemographicCluster, NodeBehaviorState
from app.models.feed import FeedItem


def sigmoid(x: float) -> float:
    # Stable sigmoid with clipping to prevent overflow
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    else:
        z = math.exp(x)
        return z / (1.0 + z)


class AudienceNetwork:
    """
    Scale-free audience network model composed of N discrete nodes
    partitioned into 5 demographic clusters with psychological and behavioral states.
    """

    def __init__(self, num_nodes: int = 500, seed: int = 42):
        self.num_nodes = num_nodes
        self.seed = seed
        self.rng = random.Random(seed)
        self.np_rng = np.random.default_rng(seed)

        # Generate Barabási–Albert graph with power-law degree distribution
        m_edges = 3
        self.graph: nx.Graph = nx.barabasi_albert_graph(num_nodes, m_edges, seed=seed)

        # In-memory node states
        self.nodes: Dict[int, AudienceNode] = {}
        # Pre-calculated cluster node IDs for fast indexing
        self.cluster_nodes: Dict[DemographicCluster, List[int]] = {
            c: [] for c in DemographicCluster
        }

        self._init_nodes()

    def _init_nodes(self):
        clusters = [
            DemographicCluster.HYPER_PARTISAN_A,
            DemographicCluster.HYPER_PARTISAN_B,
            DemographicCluster.INSTITUTIONAL_SKEPTICS,
            DemographicCluster.SUSCEPTIBLE_NEUTRALS,
            DemographicCluster.APOLITICAL_YOUTH,
        ]
        # Distribution: ~20% Partisan A, ~20% Partisan B, ~20% Skeptics, ~25% Neutrals, ~15% Youth
        weights = [0.20, 0.20, 0.20, 0.25, 0.15]

        for i in range(self.num_nodes):
            cluster = self.rng.choices(clusters, weights=weights, k=1)[0]
            self.cluster_nodes[cluster].append(i)

            if cluster == DemographicCluster.HYPER_PARTISAN_A:
                trust = float(np.clip(self.np_rng.normal(0.25, 0.08), 0.05, 0.50))
                outrage = float(np.clip(self.np_rng.normal(0.85, 0.10), 0.50, 1.0))
                bias = float(np.clip(self.np_rng.normal(0.80, 0.12), 0.40, 1.0))
                conf_bias = float(np.clip(self.np_rng.normal(0.80, 0.10), 0.50, 0.98))
            elif cluster == DemographicCluster.HYPER_PARTISAN_B:
                trust = float(np.clip(self.np_rng.normal(0.25, 0.08), 0.05, 0.50))
                outrage = float(np.clip(self.np_rng.normal(0.85, 0.10), 0.50, 1.0))
                bias = float(np.clip(self.np_rng.normal(-0.80, 0.12), -1.0, -0.40))
                conf_bias = float(np.clip(self.np_rng.normal(0.80, 0.10), 0.50, 0.98))
            elif cluster == DemographicCluster.INSTITUTIONAL_SKEPTICS:
                trust = float(np.clip(self.np_rng.normal(0.35, 0.10), 0.10, 0.60))
                outrage = float(np.clip(self.np_rng.normal(0.60, 0.12), 0.30, 0.85))
                bias = float(np.clip(self.np_rng.normal(0.0, 0.25), -0.50, 0.50))
                conf_bias = float(np.clip(self.np_rng.normal(0.65, 0.10), 0.35, 0.85))
            elif cluster == DemographicCluster.SUSCEPTIBLE_NEUTRALS:
                trust = float(np.clip(self.np_rng.normal(0.65, 0.10), 0.35, 0.90))
                outrage = float(np.clip(self.np_rng.normal(0.55, 0.15), 0.20, 0.85))
                bias = float(np.clip(self.np_rng.normal(0.05, 0.15), -0.30, 0.30))
                conf_bias = float(np.clip(self.np_rng.normal(0.40, 0.10), 0.15, 0.65))
            else:  # APOLITICAL_YOUTH
                trust = float(np.clip(self.np_rng.normal(0.50, 0.12), 0.20, 0.80))
                outrage = float(np.clip(self.np_rng.normal(0.50, 0.18), 0.10, 0.90))
                bias = float(np.clip(self.np_rng.normal(0.0, 0.20), -0.40, 0.40))
                conf_bias = float(np.clip(self.np_rng.normal(0.30, 0.10), 0.10, 0.50))

            self.nodes[i] = AudienceNode(
                index=i,
                cluster=cluster,
                trust=round(trust, 4),
                outrage_sensitivity=round(outrage, 4),
                ideological_bias=round(bias, 4),
                confirmation_bias=round(conf_bias, 4),
                prebunk_shield=0.0,
                state=NodeBehaviorState.UNAWARE,
                exposed_posts=[],
                shared_posts=[]
            )

    def apply_prebunk(self, cluster: Optional[DemographicCluster] = None, shield_boost: float = 0.4):
        target_nodes = self.cluster_nodes[cluster] if cluster else list(self.nodes.keys())
        for idx in target_nodes:
            node = self.nodes[idx]
            node.prebunk_shield = min(1.0, node.prebunk_shield + shield_boost)
            # Prebunk also slightly restores institutional trust
            node.trust = min(1.0, node.trust + 0.05)

    def apply_microtarget(self, cluster: DemographicCluster, post_id: str):
        target_nodes = self.cluster_nodes.get(cluster, [])
        for idx in target_nodes:
            node = self.nodes[idx]
            if post_id not in node.exposed_posts:
                node.exposed_posts.append(post_id)
                node.state = NodeBehaviorState.EXPOSED

    def propagate_tick(
        self,
        feed_items: List[FeedItem],
        alpha: float = 2.0,
        beta: float = 2.5,
        gamma: float = 3.0,
        delta: float = 2.0
    ) -> Dict[str, int]:
        """
        Executes one diffusion step across all feed items.
        Returns a dictionary mapping post_id to the count of new shares in this tick.
        """
        new_shares_per_post: Dict[str, int] = {item.id: 0 for item in feed_items}

        for item in feed_items:
            # Gather nodes that have already shared this post
            sharer_nodes: Set[int] = {
                idx for idx, n in self.nodes.items() if item.id in n.shared_posts
            }

            # Red team bot amplification boost
            algo_boost = 0.35 if item.is_amplified else 0.05
            # Blue team velocity friction
            base_edge_weight = 0.30 * (1.0 - item.debunk_friction)

            # 1. Step: Expose neighbors
            newly_exposed: List[int] = []
            for i, node in self.nodes.items():
                if item.id in node.exposed_posts:
                    continue

                # Find neighbors that shared post
                neighbors = list(self.graph.neighbors(i))
                sharers_in_neighbors = [nb for nb in neighbors if nb in sharer_nodes]

                if sharers_in_neighbors or item.is_amplified:
                    prod = 1.0
                    for _ in sharers_in_neighbors:
                        prod *= (1.0 - base_edge_weight)
                    p_expose = 1.0 - prod * (1.0 - algo_boost)

                    if self.rng.random() < p_expose:
                        node.exposed_posts.append(item.id)
                        if node.state == NodeBehaviorState.UNAWARE:
                            node.state = NodeBehaviorState.EXPOSED
                        newly_exposed.append(i)

            # 2. Step: Reshare probability among exposed who haven't shared
            prebunk_active = 1.0 if item.prebunk_shield_active else 0.0
            fact_check_friction = 1.0 if item.fact_check_label or item.is_debunked else 0.0

            for i, node in self.nodes.items():
                if item.id not in node.exposed_posts or item.id in node.shared_posts:
                    continue

                prebunk_term = node.prebunk_shield * (1.0 if prebunk_active else 0.5)
                # Compute reshare score
                # P(Share) = sigma(alpha * Outrage_k * O_i + beta * (1 - |B_i - Bias_k|) * C_i - gamma * PrebunkShield - delta * FactCheckFriction)
                bias_match = 1.0 - abs(node.ideological_bias - item.bias_score)
                logit = (
                    alpha * item.outrage_score * node.outrage_sensitivity
                    + beta * bias_match * node.confirmation_bias
                    - gamma * prebunk_term
                    - delta * fact_check_friction
                    - 1.5  # Baseline threshold calibration
                )
                p_share = sigmoid(logit)

                if self.rng.random() < p_share:
                    node.shared_posts.append(item.id)
                    node.state = NodeBehaviorState.SHARING
                    new_shares_per_post[item.id] += 1
                    item.shares_count += 1
                    item.likes_count += int(self.rng.randint(1, 4))

                    # Trust erosion / Polarization shift on sharing uncorrected disinfo
                    if not item.is_debunked:
                        # Trust drops if uncorrected
                        erosion = 0.05 * (1.0 - node.prebunk_shield) * item.outrage_score
                        node.trust = max(0.0, node.trust - erosion)
                        # Bias moves slightly towards extremes if outrage is high
                        bias_shift = 0.02 * item.outrage_score * (1 if node.ideological_bias >= 0 else -1)
                        node.ideological_bias = float(np.clip(node.ideological_bias + bias_shift, -1.0, 1.0))
                else:
                    # Node chose not to share. If post is debunked, trust slightly recovers
                    if item.is_debunked:
                        recovery = 0.03 * max(0.2, node.prebunk_shield)
                        node.trust = min(1.0, node.trust + recovery)
                        node.state = NodeBehaviorState.DEBUNKING

        return new_shares_per_post

    def get_cluster_metrics(self) -> Dict[str, Dict[str, float]]:
        metrics: Dict[str, Dict[str, float]] = {}
        for cluster, indices in self.cluster_nodes.items():
            if not indices:
                continue
            nodes = [self.nodes[idx] for idx in indices]
            avg_trust = float(np.mean([n.trust for n in nodes]))
            avg_bias = float(np.mean([n.ideological_bias for n in nodes]))
            avg_outrage = float(np.mean([n.outrage_sensitivity for n in nodes]))
            avg_shield = float(np.mean([n.prebunk_shield for n in nodes]))
            metrics[cluster.value] = {
                "avg_trust": round(avg_trust, 4),
                "avg_bias": round(avg_bias, 4),
                "avg_outrage": round(avg_outrage, 4),
                "avg_prebunk_shield": round(avg_shield, 4),
                "total_nodes": len(nodes),
            }
        return metrics
