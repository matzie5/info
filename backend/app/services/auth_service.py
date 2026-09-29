import time
import uuid
import jwt
import logging
from typing import Dict, Optional, Tuple
from app.config import settings
from app.models.session import UserRole

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self, secret: str = settings.JWT_SECRET):
        self.secret = secret

    def create_invite_token(
        self,
        session_id: str,
        role: UserRole,
        team_quota: int = 25,
        validity_hours: int = 24
    ) -> str:
        now = int(time.time())
        payload = {
            "sessionId": session_id,
            "role": role.value,
            "teamQuota": team_quota,
            "expiresAt": now + (validity_hours * 3600),
            "iss": "infosphere-auth-engine",
            "nonce": uuid.uuid4().hex[:8],
            "iat": now
        }
        return jwt.encode(payload, self.secret, algorithm="HS256")

    def verify_invite_token(self, token: str) -> Optional[Dict]:
        try:
            payload = jwt.decode(token, self.secret, algorithms=["HS256"])
            now = int(time.time())
            if payload.get("expiresAt", 0) < now:
                logger.warning("Invite token has expired")
                return None
            return payload
        except jwt.PyJWTError as e:
            logger.warning("Invalid invite token: %s", e)
            return None

    def generate_guest_handle(self, role: UserRole) -> Tuple[str, str]:
        short_id = uuid.uuid4().hex[:4].upper()
        user_id = f"guest_{role.value.lower()}_{uuid.uuid4().hex[:8]}"
        if role == UserRole.RED_TEAM:
            handle = f"Operative_Red_{short_id}"
        elif role == UserRole.BLUE_TEAM:
            handle = f"Defender_Blue_{short_id}"
        elif role == UserRole.OBSERVER:
            handle = f"Observer_{short_id}"
        else:
            handle = f"Instructor_{short_id}"
        return user_id, handle

    def create_firebase_custom_token(
        self,
        user_id: str,
        session_id: str,
        role: UserRole
    ) -> str:
        claims = {
            "role": role.value,
            "sessionId": session_id,
            "isGuest": True
        }
        try:
            import firebase_admin
            from firebase_admin import auth as fb_auth

            if not firebase_admin._apps:
                firebase_admin.initialize_app()
            custom_token = fb_auth.create_custom_token(user_id, claims)
            return custom_token.decode("utf-8") if isinstance(custom_token, bytes) else custom_token
        except Exception as e:
            logger.info("Firebase Admin not configured for custom tokens (%s); issuing signed fallback JWT", e)
            fallback_payload = {
                "uid": user_id,
                "sub": user_id,
                "claims": claims,
                "iss": "infosphere-auth-engine",
                "iat": int(time.time()),
                "exp": int(time.time()) + 86400
            }
            return jwt.encode(fallback_payload, self.secret, algorithm="HS256")

auth_service = AuthService()
