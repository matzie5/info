# ADR 003: Cloud Tasks Scale-to-Zero Clock vs. Cloud Scheduler & WebSockets

* **Status**: Accepted
* **Date**: 2026-10-03
* **Deciders**: Lead Architect, Cloud Infrastructure Engineer, Distributed Systems Engineer
* **Technical Story**: Deliver 10-second tick cadence on scale-to-zero serverless compute without persistent infrastructure costs or background thread CPU throttling

---

## 1. Context and Problem Statement

The Infosphere simulation engine requires discrete-time clock advances (ticks) every 10 seconds per active session (`TICK_INTERVAL_SECONDS = 10`) to update graph contagion dynamics, evaluate player actions, and trigger AI injects. 

Deploying this clock on Google Cloud Run Gen2 presents architectural challenges:
1. **CPU Throttling on Idle**: Cloud Run instances configured with `cpu_idle = true` throttle CPU allocations to near-zero immediately after an HTTP response finishes. In-process Python timer loops (`threading.Timer`, `asyncio.create_task`, or background while loops) are frozen or killed by the supervisor, resulting in irregular or abandoned ticks.
2. **Scale-to-Zero Economics**: Infosphere is an episodic training and simulation platform. Instances must scale to zero when no simulations are underway, incurring zero idle compute expenditure.
3. **Automated Heartbeat Auto-Pause**: If users close their browser or disconnect, the clock must not advance indefinitely in an empty room, consuming Firestore writes and generative AI tokens.
4. **Endpoint Authentication**: The tick trigger endpoint (`POST /api/v1/sessions/{session_id}/tick`) advances simulation state and must be rigorously protected against unauthorized public execution.

---

## 2. Considered Architectural Options

### Option A: Persistent Cloud Run with In-Process Python Sleep Loops & WebSockets
* **Mechanism**: Configure Cloud Run with `cpu_idle = false` (always-allocated CPU) and `min_instances = 1`. A background Python loop executes `asyncio.sleep(10)` and streams ticks to clients via long-lived WebSockets.
* **Cost**: Always-allocated CPU incurs continuous baseline costs (~$45–$65/month per container instance) even during days or weeks with zero active users.
* **Failure Modes**: Cloud Run instances periodically restart during infrastructure maintenance; in-process timers are abruptly killed. Multi-instance scaling requires distributed coordination (e.g., Redis locks) to prevent duplicate tick execution.

### Option B: Google Cloud Scheduler
* **Mechanism**: Cloud Scheduler triggers HTTP endpoints on a schedule.
* **Fatal Limitation**: Cloud Scheduler is based on unix cron syntax (`* * * * *`), enforcing a **minimum scheduling granularity of 1 minute (60 seconds)**. It cannot support Infosphere's mandatory 10-second simulation cadence.
* **Operational Overhead**: Creating and deleting Cloud Scheduler jobs dynamically via API for short-lived 15-minute training sessions introduces significant API latency and quota complexity.

### Option C: Self-Scheduling OIDC Cloud Tasks Queue with 60-Second Inactivity Auto-Pause (Selected)
* **Mechanism**:
  - Each simulation session operates as a discrete, self-scheduling chain of Cloud Tasks.
  - When a tick completes, `CloudTasksService.schedule_tick()` enqueues the next tick targeted at `POST /api/v1/sessions/{session_id}/tick` with `schedule_time = now + 10s`.
  - The task request is secured with an **OIDC Identity Token** signed by Google Cloud IAM for `infosphere-engine-sa`, validated by `AuthService.verify_oidc_tick_token()`.
  - **Inactivity Guardrail**: The tick handler compares the current timestamp against `session.last_heartbeat`. If `now - last_heartbeat > 60s`, the clock transitions the session to `PAUSED` and halts further task scheduling.
  - When the queue empties and no user requests arrive, Cloud Run instances scale cleanly to **zero instances**.

---

## 3. Decision Outcome

**Chosen Option**: **Option C (Self-Scheduling OIDC Cloud Tasks with 60s Inactivity Auto-Pause)**.

### Architectural Invariants:
1. **Queue Configuration**:
   - `google_cloud_tasks_queue.simulation_ticks` in `europe-west1` configured with `max_dispatches_per_second = 50`, `max_concurrent_dispatches = 100`, and `max_attempts = 3`.
2. **Authenticated Tick Handler**:
   ```python
   # backend/app/services/auth_service.py
   def verify_oidc_tick_token(self, authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
       # Verifies Google-signed OIDC bearer token against target audience
       ...
   ```
3. **Heartbeat and Scale-to-Zero Auto-Pause**:
   ```python
   # In simulation tick execution:
   if (now - session.last_heartbeat) > settings.INACTIVITY_TIMEOUT_SECONDS: # 60s
       session.state = "PAUSED"
       firestore_service.save_session(session)
       logger.info("Session %s auto-paused due to 60s inactivity; chain stopped", session_id)
       return {"status": "paused", "reason": "inactivity_timeout"}
   
   # Otherwise, schedule next tick exactly 10s out:
   cloud_tasks_service.schedule_tick(session_id, delay_seconds=10)
   ```
4. **Client-Side Real-Time Hydration**: The Angular frontend maintains state via Firestore `onSnapshot` real-time listeners (with automatic 2.5s HTTP fallback), decoupling state propagation from persistent container connections.

---

## 4. Architecture & Task Chain Workflow

```mermaid
sequenceDiagram
    autonumber
    participant Client as Angular 19 SPA
    participant CR as Cloud Run (API)
    participant FS as Firestore Native
    participant CT as Cloud Tasks Queue

    Client->>CR: POST /api/v1/sessions/{id}/join (Heartbeat registered)
    CR->>FS: persist session (last_heartbeat = T_0)
    CR->>CT: enqueue_task(delay=10s, oidc_auth=infosphere-engine-sa)
    CR-->>Client: Session Active

    loop Every 10 Seconds (While Active)
        CT->>CR: POST /api/v1/sessions/{id}/tick (OIDC Header)
        CR->>CR: verify_oidc_tick_token()
        CR->>FS: read session metadata
        alt now - last_heartbeat <= 60s
            CR->>CR: step simulation & AI narratives
            CR->>FS: commit updated tick state
            CR->>CT: enqueue next tick (delay=10s, oidc_auth)
            CR-->>CT: 200 OK (tick processed)
        else now - last_heartbeat > 60s (Inactivity Detected)
            CR->>FS: update status = PAUSED
            CR-->>CT: 200 OK (auto-pause; DO NOT schedule next task)
            Note over CR,CT: Chain terminates. Cloud Run scales to 0 instances.
        end
    end

    Note over Client,CR: User returns and interacts:
    Client->>CR: POST /api/v1/sessions/{id}/heartbeat
    CR->>CT: restart task chain (delay=10s)
```

---

## 5. Consequences & Trade-offs

### Positive Consequences
* **True Scale-to-Zero ($0 Idle Cost)**: When no sessions are active or when sessions auto-pause after 60s, Cloud Run instances spin down completely, eliminating baseline compute expenses.
* **Precise Sub-Minute Cadence**: Delivers deterministic 10-second intervals that Cloud Scheduler cannot achieve.
* **Strong Zero-Trust Authentication**: Malicious actors or public traffic cannot spoof `/tick` requests because Google Cloud IAM cryptographically signs the OIDC bearer token.
* **Horizontal Fault Isolation**: Each active session maintains its own task chain. If one session fails or experiences rate limits, other sessions on the queue remain unaffected.

### Negative Consequences & Mitigations
* **Cloud Tasks Enqueue Latency Jitter**: Slight network jitter ($\pm 200\text{ms}$) can occur in task execution dispatch.
  - *Mitigation*: The simulation engine uses discrete logical tick counters (`session.tick_count += 1`) rather than wall-clock time differences, ensuring simulation state progression remains mathematical and reproducible.
* **Cold-Start Latency on Session Resumption**: When a paused session is re-activated, spinning up a Cloud Run instance can take 1.5–2.5 seconds.
  - *Mitigation*: Cloud Run Gen2 execution environment with optimized container layer caching and non-root Python wheel installation minimizes cold starts.

---

## 6. Verification and Compliance
* Verified by `backend/tests/integration/test_tick_lifecycle.py` and `test_fault_injection_resilience.py`.
* Closes **Forensic Discrepancy #3**: Cloud Tasks OIDC token generation and route authentication are fully wired and enforced.
