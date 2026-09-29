import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from google.cloud import tasks_v2
from google.protobuf import timestamp_pb2
from app.config import settings

logger = logging.getLogger(__name__)

class CloudTasksService:
    def __init__(self):
        self._client: Optional[tasks_v2.CloudTasksClient] = None
        try:
            self._client = tasks_v2.CloudTasksClient()
            logger.info("CloudTasksClient initialized")
        except Exception as e:
            logger.warning("CloudTasksClient initialization deferred: %s", e)

    def enqueue_tick(
        self,
        session_id: str,
        delay_seconds: int = settings.TICK_INTERVAL_SECONDS,
        target_base_url: Optional[str] = None
    ) -> bool:
        base_url = target_base_url or settings.SERVICE_URL
        if not base_url:
            logger.info("[Mock Cloud Tasks] Enqueued tick for session %s in %ds (no SERVICE_URL)", session_id, delay_seconds)
            return True

        if not self._client:
            logger.info("[Mock Cloud Tasks] Client offline; simulated tick enqueue for session %s", session_id)
            return True

        try:
            target_url = f"{base_url.rstrip('/')}/api/v1/sessions/{session_id}/tick"
            payload = json.dumps({"session_id": session_id, "timestamp": datetime.now(timezone.utc).isoformat()}).encode()

            schedule_time = datetime.now(timezone.utc) + timedelta(seconds=delay_seconds)
            timestamp = timestamp_pb2.Timestamp()
            timestamp.FromDatetime(schedule_time)

            task = {
                "http_request": {
                    "http_method": tasks_v2.HttpMethod.POST,
                    "url": target_url,
                    "headers": {"Content-Type": "application/json"},
                    "body": payload,
                },
                "schedule_time": timestamp,
            }

            queue_path = settings.CLOUD_TASKS_QUEUE
            response = self._client.create_task(request={"parent": queue_path, "task": task})
            logger.info("Successfully enqueued tick task: %s", response.name)
            return True
        except Exception as e:
            logger.error("Failed to enqueue Cloud Task for session %s: %s", session_id, e)
            return False

cloud_tasks_service = CloudTasksService()
