from typing import Literal, Optional
from pydantic import BaseModel, Field


class AgentCommentary(BaseModel):
    sentiment: Literal["OUTRAGED", "SKEPTICAL", "SUPPORTIVE", "NEUTRAL"] = "NEUTRAL"
    stance: Literal["PRO_DISINFO", "ANTI_DISINFO", "UNALIGNED"] = "UNALIGNED"
    author_name: str = "Anonymous Citizen"
    author_handle: str = "@anon_user"
    comment_text: str
    quote_tweet: Optional[str] = None
    intent_to_amplify: bool = False
    outrage_score: float = Field(default=0.5, ge=0.0, le=1.0)


class SpoofedArticle(BaseModel):
    headline: str
    body_text: str
    author_name: str = "Wiadomości Polska 24 [PILNE]"
    author_handle: str = "@WiadomosciPolska24"
    media_url: Optional[str] = "https://storage.googleapis.com/infosphere-lab-assets/spoofed/pse_leak.jpg"
    outrage_score: float = Field(default=0.85, ge=0.0, le=1.0)
    bias_score: float = Field(default=0.75, ge=-1.0, le=1.0)
    target_cluster: Optional[str] = "Hyper-Partisan A"


class CrisisInjectPayload(BaseModel):
    title: str
    official_statement: str
    institution: str = "Government Security Centre (RCB)"
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "HIGH"
    trust_impact: float = 0.08
