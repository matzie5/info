import pytest
from app.ai.adk_service import adk_service
from app.ai.schemas import SpoofedArticle, AgentCommentary, CrisisInjectPayload
from app.engine.token_governor import TokenGovernor


def test_adk_spoofed_article_fallback_structure():
    governor = TokenGovernor(budget_limit_tokens=50000)
    article = adk_service.generate_spoofed_article(
        language="pl",
        prompt="Wyciek informacji o braku węgla",
        token_governor=governor
    )
    assert isinstance(article, SpoofedArticle)
    assert article.headline is not None
    assert len(article.headline) > 5
    assert 0.0 <= article.outrage_score <= 1.0


def test_adk_influencer_comment_structure():
    governor = TokenGovernor(budget_limit_tokens=50000)
    comment = adk_service.generate_influencer_comment(
        headline="Wiadomości PSE",
        body="Badania nad stanem sieci",
        outrage_score=0.75,
        persona="investigative_journalist",
        language="pl",
        token_governor=governor
    )
    assert isinstance(comment, AgentCommentary)
    assert comment.sentiment in ["OUTRAGED", "SKEPTICAL", "SUPPORTIVE", "NEUTRAL"]
    assert len(comment.comment_text) > 0


def test_adk_circuit_breaker_enforcement():
    # Exhaust budget limit
    governor = TokenGovernor(budget_limit_tokens=1000)
    governor.record_usage(prompt_tokens=800, completion_tokens=500)
    assert governor.is_circuit_breaker_tripped()

    # Generation should still succeed via offline SeedLibrary without error
    article = adk_service.generate_spoofed_article(
        language="en",
        token_governor=governor
    )
    assert isinstance(article, SpoofedArticle)
