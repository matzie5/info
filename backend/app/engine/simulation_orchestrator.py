import logging
import time
from typing import Dict, List, Optional
import uuid

from app.models.session import Session, SessionStatus, UserRole
from app.models.feed import FeedItem, Comment
from app.models.action import PlayerAction
from app.engine.network_graph import AudienceNetwork
from app.engine.metrics_calculator import calculate_metrics, evaluate_victory_condition
from app.engine.token_governor import TokenGovernor
from app.engine.actions_evaluator import ActionsEvaluator
from app.ai.adk_service import adk_service
from app.services.firestore_service import FirestoreService

logger = logging.getLogger(__name__)


class SimulationOrchestrator:
    _instances: Dict[str, "SimulationOrchestrator"] = {}

    def __init__(self, session_id: str, num_nodes: int = 500):
        self.session_id = session_id
        self.network = AudienceNetwork(num_nodes=num_nodes)
        self.token_governor = TokenGovernor()
        self.fs = FirestoreService.get_instance()
        self._pending_actions: List[PlayerAction] = []
        self._init_starter_feed_if_empty()

    @classmethod
    def get_instance(cls, session_id: str) -> "SimulationOrchestrator":
        if session_id not in cls._instances:
            cls._instances[session_id] = cls(session_id)
        return cls._instances[session_id]

    def _init_starter_feed_if_empty(self):
        items = self.fs.get_feed_items(self.session_id)
        if not items:
            # Seed initial scenario post
            initial_post = FeedItem(
                id=f"post_{uuid.uuid4().hex[:6]}",
                session_id=self.session_id,
                author_name="Alert Informacyjny PL",
                author_handle="@AlertInfoPL",
                author_avatar="https://storage.googleapis.com/infosphere-lab-assets/avatars/news_alert.png",
                is_verified=False,
                headline="Niepotwierdzone doniesienia o zakłóceniach w stacji przesyłowej Kozienice",
                content="Mieszkańcy okolicznych powiatów donoszą o spadkach napięcia w godzinach wieczornych. Służby techniczne badają sprawę.",
                created_at_tick=0,
                outrage_score=0.65,
                bias_score=0.40,
                virality_velocity=1.0,
                shares_count=12,
                likes_count=35
            )
            self.fs.save_feed_item(self.session_id, initial_post)

    def queue_action(self, action: PlayerAction):
        self._pending_actions.append(action)

    def step_tick(self, session: Session) -> Session:
        """
        Executes one full simulation clock cycle (10 seconds real-time / 1 hour scenario time).
        """
        logger.info("Advancing tick %d for session %s", session.current_tick + 1, session.id)

        # 1. Sync token governor state from session
        self.token_governor.sync_from_model(session.token_usage)

        # 2. Advance tick counter
        session.current_tick += 1

        # 3. Regenerate team budgets & decrement cooldowns
        ActionsEvaluator.regenerate_budgets_and_cooldowns(session)

        # 4. Fetch feed items
        feed_items = self.fs.get_feed_items(session.id)

        # 5. Fetch any pending actions recorded in Firestore
        tick_actions = self.fs.get_actions(session.id, tick=session.current_tick - 1)
        tick_actions.extend(self._pending_actions)
        # Deduplicate actions
        seen_ids = set()
        unique_actions = []
        for a in tick_actions:
            if a.id not in seen_ids:
                seen_ids.add(a.id)
                unique_actions.append(a)
        self._pending_actions.clear()

        # 6. Apply actions to feed and network
        updated_feed = ActionsEvaluator.process_actions(
            session=session,
            network=self.network,
            feed_items=feed_items,
            pending_actions=unique_actions,
            token_governor=self.token_governor
        )

        # 7. Propagate feed diffusion through audience graph
        new_shares = self.network.propagate_tick(updated_feed)
        total_shares_this_tick = sum(new_shares.values())

        # 8. Check for viral influencer commentary trigger (V_t or high shares)
        for item in updated_feed:
            if item.shares_count > 60 and not any(not c.is_bot for c in item.comments):
                # Trigger qualitative influencer reaction
                commentary = adk_service.generate_influencer_comment(
                    headline=item.headline or "",
                    body=item.content,
                    outrage_score=item.outrage_score,
                    persona="investigative_journalist",
                    language=session.language,
                    token_governor=self.token_governor
                )
                item.comments.append(Comment(
                    id=f"c-{uuid.uuid4().hex[:6]}",
                    author_name=commentary.author_name,
                    author_handle=commentary.author_handle,
                    author_avatar="https://storage.googleapis.com/infosphere-lab-assets/avatars/journalist.png",
                    content=commentary.comment_text,
                    is_bot=False,
                    likes_count=42
                ))
                item.comments_count = len(item.comments)

        # 9. Compute updated macro aggregated metrics
        prev_virality = session.metrics.virality_index
        metrics = calculate_metrics(
            network=self.network,
            current_shares=total_shares_this_tick,
            previous_virality=prev_virality,
            feed_items=updated_feed
        )
        session.metrics = metrics

        # 10. Append telemetry history snapshot
        history_entry = {
            "tick": session.current_tick,
            "timestamp": time.time(),
            "virality_index": metrics.virality_index,
            "polarization_score": metrics.polarization_score,
            "institutional_trust": metrics.institutional_trust,
            "disinformation_reach": metrics.disinformation_reach,
            "debunk_effectiveness": metrics.debunk_effectiveness,
            "total_shares_tick": total_shares_this_tick
        }
        session.history_metrics.append(history_entry)

        # 11. Sync token usage
        session.token_usage = self.token_governor.to_model()

        # 12. Evaluate scenario conclusion / victory condition
        victory = evaluate_victory_condition(metrics, session.current_tick, session.max_ticks)
        if victory:
            logger.info("Victory condition achieved in session %s: %s", session.id, victory)
            session.status = SessionStatus.COMPLETED
            # Record victory details in history
            session.history_metrics.append({"victory_details": victory})

        # 13. Persist updated feed items
        for item in updated_feed:
            self.fs.save_feed_item(session.id, item)

        return session
