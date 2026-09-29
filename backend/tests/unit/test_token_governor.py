import pytest
from app.engine.token_governor import TokenGovernor


def test_token_governor_tiers():
    governor = TokenGovernor(budget_limit_tokens=10000)

    # Initial state
    assert not governor.is_throttled()
    assert not governor.is_circuit_breaker_tripped()
    assert not governor.should_use_fallback_seed()

    # Normal tier (e.g. 5,000 tokens = 50%)
    governor.record_usage(prompt_tokens=3000, completion_tokens=2000)
    assert governor.total_tokens == 5000
    assert not governor.is_throttled()
    assert not governor.is_circuit_breaker_tripped()
    assert governor.cost_usd_estimated > 0

    # Throttled tier (e.g. +3,000 = 8,000 tokens = 80%)
    governor.record_usage(prompt_tokens=2000, completion_tokens=1000)
    assert governor.total_tokens == 8000
    assert governor.is_throttled()
    assert not governor.is_circuit_breaker_tripped()

    # Circuit breaker tripped (e.g. +2,500 = 10,500 tokens > 10,000)
    governor.record_usage(prompt_tokens=1500, completion_tokens=1000)
    assert governor.total_tokens == 10500
    assert governor.is_circuit_breaker_tripped()
    assert governor.should_use_fallback_seed()
