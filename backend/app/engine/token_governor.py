from typing import Union
import logging
from app.models.session import TokenUsage

logger = logging.getLogger(__name__)

# Flash estimated pricing: ~$0.075 per 1M input tokens, $0.30 per 1M output tokens
# Blended approximate: $0.00025 per 1,000 tokens
COST_PER_1K_TOKENS = 0.00025


class TokenGovernor:
    """
    Manages session AI token budget and enforces 3-tier cost governance:
    - Normal Tier (<75% budget): Full on-demand Gemini 3.5 Flash generation.
    - Throttled Tier (75-99% budget): High-frequency comments throttled, admin warned.
    - Circuit Breaker (>=100% budget): Cuts off live API calls, falls back to seed library.
    """

    def __init__(self, budget_limit_tokens: Union[int, TokenUsage] = 300000):
        if isinstance(budget_limit_tokens, TokenUsage):
            self.budget_limit_tokens = budget_limit_tokens.budget_limit_tokens
            self.prompt_tokens = budget_limit_tokens.prompt_tokens
            self.completion_tokens = budget_limit_tokens.completion_tokens
            self.requests_count = budget_limit_tokens.requests_count
        else:
            self.budget_limit_tokens = int(budget_limit_tokens)
            self.prompt_tokens = 0
            self.completion_tokens = 0
            self.requests_count = 0

    @property
    def total_tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens

    @property
    def cost_usd_estimated(self) -> float:
        return round((self.total_tokens / 1000.0) * COST_PER_1K_TOKENS, 4)

    def record_usage(self, prompt_tokens: int, completion_tokens: int):
        self.prompt_tokens += prompt_tokens
        self.completion_tokens += completion_tokens
        self.requests_count += 1

    def is_throttled(self) -> bool:
        ratio = self.total_tokens / max(1, self.budget_limit_tokens)
        return 0.75 <= ratio < 1.0

    def is_circuit_breaker_tripped(self) -> bool:
        return self.total_tokens >= self.budget_limit_tokens

    def should_use_fallback_seed(self) -> bool:
        return self.is_circuit_breaker_tripped()

    def sync_from_model(self, usage: TokenUsage):
        self.prompt_tokens = usage.prompt_tokens
        self.completion_tokens = usage.completion_tokens
        self.requests_count = usage.requests_count
        self.budget_limit_tokens = usage.budget_limit_tokens

    def to_model(self) -> TokenUsage:
        return TokenUsage(
            prompt_tokens=self.prompt_tokens,
            completion_tokens=self.completion_tokens,
            total_tokens=self.total_tokens,
            cost_usd_estimated=self.cost_usd_estimated,
            budget_limit_tokens=self.budget_limit_tokens,
            is_throttled=self.is_throttled(),
            is_circuit_breaker_tripped=self.is_circuit_breaker_tripped(),
            requests_count=self.requests_count
        )
