import logging
import time
from typing import Dict, List, Optional
from google.cloud import firestore
from app.config import settings
from app.models.session import Session, SessionStatus, UserRole, PlayerPresence, SimulationMetrics
from app.models.feed import FeedItem
from app.models.action import PlayerAction

logger = logging.getLogger(__name__)

class FirestoreService:
    _instance: Optional["FirestoreService"] = None

    def __init__(self, in_memory: bool = False):
        self.in_memory = in_memory
        self._mem_sessions: Dict[str, dict] = {}
        self._mem_feed: Dict[str, Dict[str, dict]] = {}
        self._mem_actions: Dict[str, List[dict]] = {}
        self._mem_network_snapshots: Dict[str, Dict[str, dict]] = {}
        self._db: Optional[firestore.Client] = None

        if not in_memory:
            try:
                self._db = firestore.Client(project=settings.PROJECT_ID)
                logger.info("Firestore client initialized for project %s", settings.PROJECT_ID)
            except Exception as e:
                logger.warning("Firestore connection failed (%s); falling back to in-memory store", e)
                self.in_memory = True

    @classmethod
    def get_instance(cls) -> "FirestoreService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # Sessions
    def get_session(self, session_id: str) -> Optional[Session]:
        if self.in_memory:
            data = self._mem_sessions.get(session_id)
            return Session(**data) if data else None

        try:
            doc_ref = self._db.collection("sessions").document(session_id)
            doc = doc_ref.get()
            if doc.exists:
                return Session(**doc.to_dict())
            return None
        except Exception as e:
            logger.error("Error fetching session %s: %s", session_id, e)
            return None

    def save_session(self, session: Session) -> Session:
        session.updated_at = time.time()
        session_data = session.model_dump()

        if self.in_memory:
            self._mem_sessions[session.id] = session_data
            return session

        try:
            doc_ref = self._db.collection("sessions").document(session.id)
            doc_ref.set(session_data, merge=True)
            return session
        except Exception as e:
            logger.error("Error saving session %s: %s", session.id, e)
            self._mem_sessions[session.id] = session_data
            return session

    # Feed Items
    def get_feed_items(self, session_id: str) -> List[FeedItem]:
        if self.in_memory:
            items_dict = self._mem_feed.get(session_id, {})
            sorted_items = sorted(items_dict.values(), key=lambda x: x.get("created_at_tick", 0), reverse=True)
            return [FeedItem(**i) for i in sorted_items]

        try:
            col_ref = self._db.collection("sessions").document(session_id).collection("feed")
            docs = col_ref.order_by("created_at_tick", direction=firestore.Query.DESCENDING).stream()
            return [FeedItem(**doc.to_dict()) for doc in docs]
        except Exception as e:
            logger.error("Error streaming feed items for session %s: %s", session_id, e)
            return []

    def save_feed_item(self, session_id: str, item: FeedItem) -> FeedItem:
        item_data = item.model_dump()
        if self.in_memory:
            if session_id not in self._mem_feed:
                self._mem_feed[session_id] = {}
            self._mem_feed[session_id][item.id] = item_data
            return item

        try:
            col_ref = self._db.collection("sessions").document(session_id).collection("feed")
            col_ref.document(item.id).set(item_data, merge=True)
            return item
        except Exception as e:
            logger.error("Error saving feed item %s: %s", item.id, e)
            return item

    # Player Actions
    def record_action(self, session_id: str, action: PlayerAction) -> PlayerAction:
        action_data = action.model_dump()
        if self.in_memory:
            if session_id not in self._mem_actions:
                self._mem_actions[session_id] = []
            self._mem_actions[session_id].append(action_data)
            return action

        try:
            col_ref = self._db.collection("sessions").document(session_id).collection("actions")
            col_ref.document(action.id).set(action_data)
            return action
        except Exception as e:
            logger.error("Error recording player action %s: %s", action.id, e)
            return action

    def get_actions(self, session_id: str, tick: Optional[int] = None) -> List[PlayerAction]:
        if self.in_memory:
            actions_list = self._mem_actions.get(session_id, [])
            if tick is not None:
                actions_list = [a for a in actions_list if a.get("tick") == tick]
            return [PlayerAction(**a) for a in actions_list]

        try:
            col_ref = self._db.collection("sessions").document(session_id).collection("actions")
            if tick is not None:
                docs = col_ref.where("tick", "==", tick).stream()
            else:
                docs = col_ref.stream()
            return [PlayerAction(**doc.to_dict()) for doc in docs]
        except Exception as e:
            logger.error("Error fetching actions for session %s: %s", session_id, e)
            return []

    # Heartbeats & Presence
    def register_heartbeat(self, session_id: str, user_id: str, role: UserRole, handle: str) -> Optional[Session]:
        session = self.get_session(session_id)
        if not session:
            return None

        now = time.time()
        session.players[user_id] = PlayerPresence(
            user_id=user_id,
            role=role,
            handle=handle,
            last_heartbeat=now,
            is_active=True
        )
        return self.save_session(session)

    def has_active_players(self, session_id: str, threshold_seconds: int = 60) -> bool:
        session = self.get_session(session_id)
        if not session:
            return False

        now = time.time()
        active_count = 0
        for p in session.players.values():
            if now - p.last_heartbeat < threshold_seconds:
                active_count += 1
                p.is_active = True
            else:
                p.is_active = False

        if active_count != len(session.players):
            self.save_session(session)

        return active_count > 0

    # Network Graph Snapshots
    def save_network_snapshot(self, session_id: str, snapshot: Dict[str, dict]) -> None:
        self._mem_network_snapshots[session_id] = snapshot
        if self.in_memory:
            return

        try:
            doc_ref = self._db.collection("sessions").document(session_id).collection("network").document("snapshot")
            doc_ref.set({"nodes": snapshot, "updated_at": time.time()})
        except Exception as e:
            logger.error("Error saving network snapshot for session %s: %s", session_id, e)

    def load_network_snapshot(self, session_id: str) -> Optional[Dict[str, dict]]:
        if self.in_memory:
            return self._mem_network_snapshots.get(session_id)

        try:
            doc_ref = self._db.collection("sessions").document(session_id).collection("network").document("snapshot")
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict() or {}
                nodes = data.get("nodes", data)
                self._mem_network_snapshots[session_id] = nodes
                return nodes
            return self._mem_network_snapshots.get(session_id)
        except Exception as e:
            logger.error("Error loading network snapshot for session %s: %s", session_id, e)
            return self._mem_network_snapshots.get(session_id)

