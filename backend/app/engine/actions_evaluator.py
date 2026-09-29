import logging
import uuid
import time
from typing import List, Optional
from app.models.session import Session, UserRole
from app.models.feed import FeedItem, Comment
from app.models.action import PlayerAction, ActionType
from app.engine.network_graph import AudienceNetwork
from app.engine.token_governor import TokenGovernor
from app.ai.adk_service import adk_service

logger = logging.getLogger(__name__)


class ActionsEvaluator:
    """
    Applies tactical Red Team, Blue Team, and Facilitator actions to the simulation state.
    """

    @staticmethod
    def process_actions(
        session: Session,
        network: AudienceNetwork,
        feed_items: List[FeedItem],
        pending_actions: List[PlayerAction],
        token_governor: TokenGovernor
    ) -> List[FeedItem]:
        """
        Executes all submitted player actions for the tick and returns updated feed items.
        """
        updated_feed = list(feed_items)

        for action in pending_actions:
            logger.info("Executing action: %s by %s (%s)", action.action_type, action.user_id, action.team)

            if action.action_type == ActionType.DEPLOY_BOT_SWARM:
                # Find target post
                target = next((item for item in updated_feed if item.id == action.target_post_id), None)
                if target:
                    target.is_amplified = True
                    target.virality_velocity = 2.5
                    target.shares_count += 45
                    target.likes_count += 120
                    # Add simulated bot comments
                    bot_comments = adk_service.generate_bot_comments(
                        headline=target.headline or target.content[:50],
                        count=3,
                        language=session.language,
                        token_governor=token_governor
                    )
                    for c_text in bot_comments:
                        target.comments.append(Comment(
                            id=f"c-{uuid.uuid4().hex[:6]}",
                            author_name="User_" + uuid.uuid4().hex[:4],
                            author_handle="@bot_" + uuid.uuid4().hex[:5],
                            author_avatar="https://storage.googleapis.com/infosphere-lab-assets/avatars/bot.png",
                            content=c_text,
                            is_bot=True,
                            likes_count=int(time.time() % 15)
                        ))
                    target.comments_count = len(target.comments)

            elif action.action_type == ActionType.AI_DEEPFAKE_ARTICLE:
                # Generate spoofed article via ADK / Gemini 3.5 Flash
                spoofed = adk_service.generate_spoofed_article(
                    language=session.language,
                    prompt=action.custom_prompt or action.content,
                    cluster=action.target_cluster.value if action.target_cluster else None,
                    token_governor=token_governor
                )
                new_post = FeedItem(
                    id=f"post_{uuid.uuid4().hex[:6]}",
                    session_id=session.id,
                    author_name=action.headline or spoofed.author_name,
                    author_handle=spoofed.author_handle,
                    author_avatar="https://storage.googleapis.com/infosphere-lab-assets/avatars/news_alert.png",
                    is_verified=False,
                    headline=action.headline or spoofed.headline,
                    content=action.content or spoofed.body_text,
                    media_url=spoofed.media_url,
                    created_at_tick=session.current_tick,
                    outrage_score=spoofed.outrage_score,
                    bias_score=spoofed.bias_score,
                    is_amplified=True,
                    virality_velocity=1.8,
                    targeted_clusters=[action.target_cluster.value] if action.target_cluster else []
                )
                if action.target_cluster:
                    network.apply_microtarget(action.target_cluster, new_post.id)
                updated_feed.insert(0, new_post)

            elif action.action_type == ActionType.MICROTARGET_CLUSTER:
                if action.target_cluster and action.target_post_id:
                    network.apply_microtarget(action.target_cluster, action.target_post_id)
                    target = next((item for item in updated_feed if item.id == action.target_post_id), None)
                    if target and action.target_cluster.value not in target.targeted_clusters:
                        target.targeted_clusters.append(action.target_cluster.value)

            elif action.action_type == ActionType.ASTROTURF_COMMENTS:
                target = next((item for item in updated_feed if item.id == action.target_post_id), None)
                if target:
                    bot_comments = adk_service.generate_bot_comments(
                        headline=target.headline or target.content[:50],
                        count=4,
                        language=session.language,
                        token_governor=token_governor
                    )
                    for c_text in bot_comments:
                        target.comments.append(Comment(
                            id=f"c-{uuid.uuid4().hex[:6]}",
                            author_name="AlertWatcher_" + uuid.uuid4().hex[:3],
                            author_handle="@pulse_" + uuid.uuid4().hex[:4],
                            author_avatar="https://storage.googleapis.com/infosphere-lab-assets/avatars/bot.png",
                            content=c_text,
                            is_bot=True,
                            likes_count=12
                        ))
                    target.comments_count = len(target.comments)

            elif action.action_type == ActionType.PREBUNK_CAMPAIGN:
                network.apply_prebunk(action.target_cluster, shield_boost=0.4)
                # Apply shield flag to existing or upcoming posts
                if action.target_post_id:
                    target = next((item for item in updated_feed if item.id == action.target_post_id), None)
                    if target:
                        target.prebunk_shield_active = True
                else:
                    for item in updated_feed:
                        item.prebunk_shield_active = True

            elif action.action_type == ActionType.EVIDENCE_DEBUNK:
                target = next((item for item in updated_feed if item.id == action.target_post_id), None)
                if target:
                    target.is_debunked = True
                    target.debunk_friction = 0.70
                    target.fact_check_label = (
                        "ZWERYFIKOWANE JAKO FAŁSZ: Polskie Sieci Elektroenergetyczne nie planują wyłączeń prądu. Rezerwy mocy są stabilne."
                        if session.language == "pl"
                        else "VERIFIED FALSE: Transmission system operator confirms power supply reserves are completely stable."
                    )
                    # Add verified debunk comment
                    influencer_comment = adk_service.generate_influencer_comment(
                        headline=target.headline or "",
                        body=target.content,
                        outrage_score=target.outrage_score,
                        persona="civic_activist",
                        language=session.language,
                        token_governor=token_governor
                    )
                    target.comments.insert(0, Comment(
                        id=f"c-{uuid.uuid4().hex[:6]}",
                        author_name=influencer_comment.author_name,
                        author_handle=influencer_comment.author_handle,
                        author_avatar="https://storage.googleapis.com/infosphere-lab-assets/avatars/activist.png",
                        content=influencer_comment.comment_text,
                        is_bot=False,
                        likes_count=85
                    ))
                    target.comments_count = len(target.comments)

            elif action.action_type == ActionType.VELOCITY_FRICTION:
                target = next((item for item in updated_feed if item.id == action.target_post_id), None)
                if target:
                    target.debunk_friction = 0.60
                    target.virality_velocity = 0.40
                else:
                    for item in updated_feed:
                        item.debunk_friction = 0.60
                        item.virality_velocity = 0.40

            elif action.action_type == ActionType.PUBLIC_ADVISORY or action.action_type == ActionType.CRISIS_INJECT:
                inject = adk_service.generate_crisis_inject(
                    language=session.language,
                    token_governor=token_governor
                )
                advisory_post = FeedItem(
                    id=f"post_{uuid.uuid4().hex[:6]}",
                    session_id=session.id,
                    author_name=inject.institution,
                    author_handle="@RCB_Alert_PL" if session.language == "pl" else "@GovGridSecurity",
                    author_avatar="https://storage.googleapis.com/infosphere-lab-assets/avatars/rcb_gov.png",
                    is_verified=True,
                    headline=inject.title,
                    content=inject.official_statement,
                    created_at_tick=session.current_tick,
                    outrage_score=0.10,
                    bias_score=0.0,
                    is_debunked=True,
                    debunk_friction=0.0,
                    virality_velocity=1.5
                )
                updated_feed.insert(0, advisory_post)
                # Boost baseline trust across all nodes
                for node in network.nodes.values():
                    node.trust = min(1.0, node.trust + inject.trust_impact)

        return updated_feed

    @staticmethod
    def regenerate_budgets_and_cooldowns(session: Session):
        """
        Regenerates +10 resource points per tick up to cap of 100,
        and decrements cooldown counters.
        """
        session.budgets.red_team_capital = min(100.0, session.budgets.red_team_capital + 10.0)
        session.budgets.blue_team_bandwidth = min(100.0, session.budgets.blue_team_bandwidth + 10.0)

        # Decrement cooldowns
        for k in list(session.budgets.red_cooldowns.keys()):
            if session.budgets.red_cooldowns[k] > 0:
                session.budgets.red_cooldowns[k] -= 1

        for k in list(session.budgets.blue_cooldowns.keys()):
            if session.budgets.blue_cooldowns[k] > 0:
                session.budgets.blue_cooldowns[k] -= 1
