import pytest
import networkx as nx
from app.engine.network_graph import AudienceNetwork
from app.models.node import DemographicCluster, NodeBehaviorState


def test_audience_network_initialization():
    network = AudienceNetwork(num_nodes=500, seed=42)
    assert len(network.nodes) == 500
    assert network.graph.number_of_nodes() == 500
    # Power-law / scale free graph should have edges
    assert network.graph.number_of_edges() > 1000

    # Ensure all 5 demographic clusters are populated
    for cluster in DemographicCluster:
        count = len(network.cluster_nodes[cluster])
        assert count > 40, f"Cluster {cluster} has fewer nodes than expected: {count}"


def test_node_attributes_bounded():
    network = AudienceNetwork(num_nodes=100, seed=123)
    for node in network.nodes.values():
        assert 0.0 <= node.trust <= 1.0
        assert 0.0 <= node.outrage_sensitivity <= 1.0
        assert -1.0 <= node.ideological_bias <= 1.0
        assert 0.0 <= node.confirmation_bias <= 1.0
        assert 0.0 <= node.prebunk_shield <= 1.0
        assert node.state == NodeBehaviorState.UNAWARE


def test_apply_prebunk_boost():
    network = AudienceNetwork(num_nodes=100, seed=42)
    cluster = DemographicCluster.SUSCEPTIBLE_NEUTRALS
    initial_shields = [network.nodes[i].prebunk_shield for i in network.cluster_nodes[cluster]]
    assert all(s == 0.0 for s in initial_shields)

    network.apply_prebunk(cluster, shield_boost=0.4)
    updated_shields = [network.nodes[i].prebunk_shield for i in network.cluster_nodes[cluster]]
    assert all(s >= 0.4 for s in updated_shields)


def test_apply_microtarget():
    network = AudienceNetwork(num_nodes=100, seed=42)
    cluster = DemographicCluster.HYPER_PARTISAN_A
    post_id = "test_disinfo_post_1"

    network.apply_microtarget(cluster, post_id)
    for idx in network.cluster_nodes[cluster]:
        assert post_id in network.nodes[idx].exposed_posts
        assert network.nodes[idx].state == NodeBehaviorState.EXPOSED
