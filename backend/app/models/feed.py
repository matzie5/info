import time
from typing import List, Optional
from pydantic import BaseModel, Field

class Comment(BaseModel):
    id: str
    author_name: str
    author_handle: str
    author_avatar: str
    content: str
    is_bot: bool = False
    likes_count: int = 0
    created_at: float = Field(default_factory=lambda: time.time())

class FeedItem(BaseModel):
    id: str
    session_id: str
    author_name: str
    author_handle: str
    author_avatar: str
    is_verified: bool = False
    content: str
    headline: Optional[str] = None
    media_url: Optional[str] = None
    created_at_tick: int = 0
    timestamp: float = Field(default_factory=lambda: time.time())
    outrage_score: float = Field(default=0.5, ge=0.0, le=1.0)
    bias_score: float = Field(default=0.0, ge=-1.0, le=1.0)
    is_amplified: bool = False
    is_debunked: bool = False
    debunk_friction: float = 0.0
    prebunk_shield_active: bool = False
    fact_check_label: Optional[str] = None
    virality_velocity: float = 1.0
    shares_count: int = 0
    likes_count: int = 0
    comments_count: int = 0
    targeted_clusters: List[str] = Field(default_factory=list)
    comments: List[Comment] = Field(default_factory=list)
