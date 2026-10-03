# backend/app/platform/telemetry.py
import json
import logging
import time
from typing import Any, Dict, List, Optional
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


class PlatformTelemetryService:
    """
    OpenTelemetry Span Collector, Latency Percentile Tracker (P50/P95/P99),
    and Cloud Pub/Sub (`session-ai-tasks`) Asynchronous Task Dispatcher.
    """

    def __init__(self):
        self._latencies: Dict[str, List[float]] = {}
        self._dispatched_pubsub_tasks: List[Dict[str, Any]] = []
        self._pubsub_publisher = None
        self._tracer = None
        self._init_otel_and_pubsub()

    def _init_otel_and_pubsub(self):
        try:
            from opentelemetry import trace
            from opentelemetry.sdk.trace import TracerProvider

            provider = TracerProvider()
            trace.set_tracer_provider(provider)
            self._tracer = trace.get_tracer("infosphere.platform")
        except Exception as e:
            logger.debug("OpenTelemetry SDK fallback mode: %s", e)

        if settings.ENABLE_ASYNC_PUBSUB and settings.ENVIRONMENT != "local":
            try:
                from google.cloud import pubsub_v1

                self._pubsub_publisher = pubsub_v1.PublisherClient()
            except Exception as e:
                logger.warning("PubSub PublisherClient offline (%s); using in-memory task queue", e)

    def record_latency_ms(self, operation: str, duration_ms: float) -> None:
        bucket = self._latencies.setdefault(operation, [])
        bucket.append(round(duration_ms, 2))
        if len(bucket) > 500:
            bucket.pop(0)

    def get_latency_percentiles(self, operation: str) -> Dict[str, float]:
        samples = self._latencies.get(operation, [])
        if not samples:
            return {"p50_ms": 0.0, "p95_ms": 0.0, "p99_ms": 0.0, "count": 0}
        arr = np.array(samples, dtype=np.float32)
        return {
            "p50_ms": round(float(np.percentile(arr, 50)), 2),
            "p95_ms": round(float(np.percentile(arr, 95)), 2),
            "p99_ms": round(float(np.percentile(arr, 99)), 2),
            "count": len(samples),
        }

    def publish_ai_task(self, task_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Publishes an asynchronous AI/forensic task to `settings.PUBSUB_TOPIC` (`session-ai-tasks`)
        with deterministic local queue fallback.
        """
        envelope = {
            "topic": settings.PUBSUB_TOPIC,
            "task_type": task_type,
            "payload": payload,
            "timestamp": time.time(),
        }
        if self._pubsub_publisher:
            try:
                data = json.dumps(envelope).encode("utf-8")
                future = self._pubsub_publisher.publish(settings.PUBSUB_TOPIC, data)
                envelope["message_id"] = future.result(timeout=3.0)
                envelope["delivery_mode"] = "cloud_pubsub"
                return envelope
            except Exception as e:
                logger.warning("Cloud Pub/Sub publish failed (%s); queueing locally", e)

        envelope["message_id"] = f"local-pubsub-{len(self._dispatched_pubsub_tasks) + 1}"
        envelope["delivery_mode"] = "in_memory_fallback"
        self._dispatched_pubsub_tasks.append(envelope)
        return envelope


telemetry_service = PlatformTelemetryService()
