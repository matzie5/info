# backend/app/services/user_service.py
import hashlib
import hmac
import logging
import os
import time
import uuid
from typing import Dict, List, Optional
import jwt

from app.config import settings
from app.models.user import User, UserPublic, UserRegisterRequest, UserRoleType

logger = logging.getLogger(__name__)


class UserService:
    _instance: Optional["UserService"] = None

    def __init__(self):
        self._users: Dict[str, User] = {}
        self._username_map: Dict[str, str] = {}
        self._seed_default_users()

    @classmethod
    def get_instance(cls) -> "UserService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @staticmethod
    def _hash_password(password: str, salt: str) -> str:
        return hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100000,
        ).hex()

    def _seed_default_users(self):
        default_accounts = [
            {
                "username": "admin",
                "email": "director@infosphere.security",
                "display_name": "Security Director (Admin)",
                "password": "admin123",
                "role": UserRoleType.ADMIN,
                "cohort_id": "cohort_cyber_defense_2026",
            },
            {
                "username": "player1",
                "email": "alex.operative@infosphere.io",
                "display_name": "Alex Vance (Player 1)",
                "password": "player123",
                "role": UserRoleType.PLAYER,
                "cohort_id": "cohort_cyber_defense_2026",
            },
            {
                "username": "player2",
                "email": "sam.defender@infosphere.io",
                "display_name": "Sam Carter (Player 2)",
                "password": "player123",
                "role": UserRoleType.PLAYER,
                "cohort_id": "cohort_cyber_defense_2026",
            },
        ]
        for acc in default_accounts:
            uid = f"user_{acc['username']}"
            salt = uuid.uuid4().hex
            hashed = self._hash_password(acc["password"], salt)
            user = User(
                id=uid,
                username=acc["username"],
                email=acc["email"],
                display_name=acc["display_name"],
                hashed_password=hashed,
                salt=salt,
                role=acc["role"],
                cohort_id=acc["cohort_id"],
                created_at=time.time(),
            )
            self._users[uid] = user
            self._username_map[acc["username"].lower()] = uid

    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        uid = self._username_map.get(username.strip().lower())
        if not uid:
            return None
        user = self._users.get(uid)
        if not user:
            return None
        expected_hash = self._hash_password(password, user.salt)
        if hmac.compare_digest(user.hashed_password, expected_hash):
            return user
        return None

    def create_user(self, req: UserRegisterRequest) -> User:
        username_clean = req.username.strip().lower()
        if username_clean in self._username_map:
            raise ValueError(f"Username '{req.username}' is already taken.")

        uid = f"user_{uuid.uuid4().hex[:10]}"
        salt = uuid.uuid4().hex
        hashed = self._hash_password(req.password, salt)
        display_name = req.display_name or req.username
        role = req.role or UserRoleType.PLAYER

        user = User(
            id=uid,
            username=req.username.strip(),
            email=req.email.strip(),
            display_name=display_name.strip(),
            hashed_password=hashed,
            salt=salt,
            role=role,
            cohort_id=req.cohort_id or "cohort_cyber_defense_2026",
            created_at=time.time(),
        )
        self._users[uid] = user
        self._username_map[username_clean] = uid
        return user

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        return self._users.get(user_id)

    def get_user_by_username(self, username: str) -> Optional[User]:
        uid = self._username_map.get(username.strip().lower())
        if uid:
            return self._users.get(uid)
        return None

    def list_users(self, cohort_id: Optional[str] = None) -> List[User]:
        users = list(self._users.values())
        if cohort_id:
            users = [u for u in users if u.cohort_id == cohort_id]
        return users

    def create_access_token(self, user: User, validity_hours: int = 48) -> str:
        now = int(time.time())
        payload = {
            "sub": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "email": user.email,
            "role": user.role.value,
            "cohort_id": user.cohort_id,
            "iat": now,
            "exp": now + (validity_hours * 3600),
            "iss": "infosphere-auth-engine",
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

    def decode_access_token(self, token: str) -> Optional[Dict]:
        prev_secret = getattr(settings, "JWT_PREVIOUS_SECRET", "")
        payload = None
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        except jwt.InvalidSignatureError as e:
            if prev_secret:
                try:
                    payload = jwt.decode(token, prev_secret, algorithms=["HS256"])
                except Exception as ex:
                    logger.warning("Token verification failed with previous secret: %s", ex)
                    return None
            else:
                logger.warning("Token verification failed: %s", e)
                return None
        except Exception as e:
            logger.warning("Token decode error: %s", e)
            return None

        if payload.get("exp", 0) < time.time():
            logger.warning("Token expired")
            return None
        return payload

    def to_public(self, user: User) -> UserPublic:
        return UserPublic(
            id=user.id,
            username=user.username,
            email=user.email,
            display_name=user.display_name,
            role=user.role,
            cohort_id=user.cohort_id,
            created_at=user.created_at,
        )


user_service = UserService.get_instance()
