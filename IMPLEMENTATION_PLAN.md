# Infosphere Lab Module: End-to-End Implementation Plan

This implementation plan translates the hardened [TECHNICAL_SPECIFICATION.md](file:///home/admin_/info/TECHNICAL_SPECIFICATION.md) into concrete, sequential engineering phases.

---

## Phase 0: Cloud Project & Infrastructure Provisioning (Terraform)
*Goal: Establish all GCP resources in a single project with automated IaC.*

- [x] **Task 0.1: Target Project & Auth Validation**
  - Verify active credentials for `admin@ziener.altostrat.com`.
  - Validate IAM permissions on target project (`infosphere-511`).
- [x] **Task 0.2: Terraform Module Structure (`terraform/`)**
  - `modules/services`: Enable APIs (`run`, `cloudtasks`, `pubsub`, `firestore`, `aiplatform`, `storage`, `identitytoolkit`).
  - `modules/iam`: Create `infosphere-engine-sa` with least-privilege roles (`roles/datastore.user`, `roles/cloudtasks.enqueuer`, `roles/pubsub.publisher`, `roles/aiplatform.user`, `roles/storage.objectViewer`).
  - `modules/cloud_tasks`: Create `simulation-ticks-queue` (50 dispatches/sec, 3 retry attempts).
  - `modules/pubsub`: Create topic `session-ai-tasks` and push/pull subscription.
  - `modules/storage`: Create `${PROJECT_ID}-infosphere-assets` with web CORS policy.
  - `modules/firestore`: Configure Firestore Native Mode and composite indexes.
  - `modules/cloud_run`: Define Cloud Run Gen2 service (`min_instance_count = 0`, `max_instance_count = 100`, `cpu_idle = true`).
- [x] **Task 0.3: Infrastructure Deployment**
  - Initialize and apply Terraform (`terraform apply`).
  - Verify Cloud Tasks queue, Storage bucket, and Firestore accessibility.

---

## Phase 1: Backend Foundation & FastAPI Core
*Goal: Stand up the Python 3.12 FastAPI service with Firestore and frictionless authentication.*

- [x] **Task 1.1: Project Scaffolding & Configuration**
  - Initialized `backend/` with Python 3.12, `requirements.txt` (`fastapi`, `uvicorn`, `pydantic`, `google-cloud-firestore`, `google-cloud-tasks`, `google-cloud-pubsub`, `firebase-admin`, `networkx`, `numpy`).
  - Configured `app/config.py` loading project ID, region, and queue paths from environment.
  - Dockerfile using `python:3.12-slim` (<90MB base) with health check endpoint (`GET /healthz`).
- [x] **Task 1.2: Domain Models & Firestore Repository**
  - Implemented Pydantic models in `app/models/`: `Session`, `FeedItem`, `NodeState`, `PlayerAction`, `TokenLedger`, `PlayerPresence`.
  - Implemented `app/services/firestore_service.py` using `firebase_admin` for transactional session updates, feed items, actions, and player presence.
- [x] **Task 1.3: Frictionless Magic Join Token Engine**
  - Implemented `app/api/v1/invites.py`: Signed HMAC/JWT generator for invite links with embedded role (`RED_TEAM`, `BLUE_TEAM`, `OBSERVER`), expiration, and quota limits.
  - Implemented `POST /api/v1/sessions/{sessionId}/join-by-token` which validates the invite token and issues role assignment and session affiliation.
- [x] **Task 1.4: Cloud Tasks Protected Tick Endpoint**
  - Implemented `POST /api/v1/sessions/{sessionId}/tick` with Google Cloud OIDC token verification.
  - Implemented `app/services/cloud_tasks_service.py` to enqueue the subsequent tick task (`schedule_time = now + 10s`).
  - Unit tests for invite token signing and Cloud Tasks dispatch passing.

---

## Phase 2: Agent-Based Simulation (ABM) Engine & Mathematics
*Goal: Build the 500-node scale-free audience network and mathematical propagation engine.*

- [x] **Task 2.1: Audience Network Graph (`app/engine/network_graph.py`)**
  - Generated a 500-node scale-free network (Barabási–Albert with clustering) partitioned into 5 demographic clusters:
    - *Hyper-Partisan A*, *Hyper-Partisan B*, *Institutional Skeptics*, *Susceptible Neutrals*, *Apolitical Youth*.
  - Assigned node parameters ($T_i$ Trust, $O_i$ Outrage, $B_i$ Ideological Bias, $C_i$ Confirmation Bias, $M_i$ Prebunk Shield).
- [x] **Task 2.2: Vectorized Propagation Calculus (`app/engine/metrics_calculator.py`)**
  - Implemented logistic sigmoid reshare probability:
    $P(\text{Share}_{i,k}) = \sigma(\alpha \cdot \text{Outrage}_k \cdot O_i + \beta \cdot (1 - |B_i - \text{Bias}_k|) \cdot C_i - \gamma \cdot \text{PrebunkShield}_{i,k} - \delta \cdot \text{FactCheckFriction}_k)$.
  - Implemented trust erosion and recovery functions.
  - Implemented macro indices bounded strictly between $[0.0, 100.0]$: Virality Index, Polarization Score, Institutional Trust Index, Disinformation Reach, Debunk Effectiveness, and victory evaluation.
- [x] **Task 2.3: Player Action Evaluator (`app/engine/actions_evaluator.py`)**
  - Processed Red Team actions: *Deploy Bot Swarm*, *AI Deepfake Article*, *Microtarget Cluster*, *Astroturf Comment Storm*.
  - Processed Blue Team actions: *Prebunk Campaign*, *Evidence Debunk*, *Algorithmic Velocity Friction*, *Public Advisory*.
  - Processed Facilitator actions: *Government Crisis Advisory (RCB)*.
  - Managed team resource budgets ($+10$ points/tick, max 100) and action cooldowns.
- [x] **Task 2.4: Simulation Orchestrator & Auto-Pause (`app/engine/simulation_orchestrator.py`)**
  - Executed full tick step: Ingest actions $\to$ Diffuse feed $\to$ Update nodes $\to$ Trigger AI commentary $\to$ Compute metrics $\to$ Save to Firestore.
  - Evaluated player heartbeats: If all players disconnected for $>60\text{s}$, transition session to `PAUSED` and stop enqueuing tasks (achieving scale-to-zero).
  - Pytest test suite: 100 consecutive ticks verifying numeric stability and boundary invariant preservation.

---

## Phase 3: Gemini 3.5 Flash & ADK Integration
*Goal: Integrate generative AI for qualitative influencer comments and synthetic media with cost control.*

- [x] **Task 3.1: Token Governor & Cost Circuit Breaker (`app/engine/token_governor.py`)**
  - Track prompt, completion, and total tokens per session atomically in Firestore.
  - Enforce 3-tier governance:
    - Normal Tier ($<75\%$ budget): Full on-demand Gemini 3.5 Flash generation.
    - Throttled Tier ($75\text{--}99\%$ budget): Rate-limit Red Team custom prompts, notify Admin HUD.
    - Circuit Breaker ($100\%$ budget): Cut off live API calls, fall back seamlessly to offline seed library.
- [x] **Task 3.2: High-Fidelity Offline Seed Library (`app/ai/seed_library.py`)**
  - Pre-generated scenario headlines, comments, persona reactions, bot storms, and crisis injects for instant zero-cost fallback in Polish (`pl`) and English (`en`).
- [x] **Task 3.3: ADK Agent Service (`app/ai/adk_service.py`)**
  - Configured Google GenAI / Vertex client with persona prompt templates.
  - Enforced strict JSON output schemas (`AgentCommentary`, `SpoofedArticle`, `CrisisInjectPayload`) with Gemini 3.5 Flash.
  - Parameterized prompt templates for Polish (`pl`) and English (`en`) localized generation.

---

## Phase 4: Angular 19 Frontend - Core & Design System
*Goal: Build the responsive Angular 19 client with Lato typography, custom accents, and multi-language support.*

- [x] **Task 4.1: Project Setup & Design Tokens**
  - Scaffolded Angular 19 SPA with standalone components and reactive Signals architecture.
  - Embedded Google Font **Lato** (weights 300, 400, 700, 900) in `index.html`.
  - Implemented design system tokens in `src/styles.css`:
    - Primary Defense Accent: `#84AA40` (Olive-Green)
    - Secondary Virality Accent: `#F9A81C` (Warm Amber-Gold)
    - Dark mode theme tokens (`#0B0F17` background, glassmorphism cards, glowing status borders).
- [x] **Task 4.2: Multi-Language (i18n) Engine**
  - Created lightweight reactive `LocaleService` with signal-based dictionary loading.
  - Populated `public/assets/i18n/en.json` and `public/assets/i18n/pl.json`.
  - Added language switcher component in Lobby and navigation headers.
- [x] **Task 4.3: Authentication & Real-Time Sync**
  - Route handler for magic invite URLs (`/join?token=...&sessionId=...`) in `JoinComponent`.
  - `FirestoreSyncService`: Bridges Firestore state and adaptive polling fallback into reactive Angular `signal()` and `computed()` values.
  - `HeartbeatService`: Pings `/api/v1/sessions/{id}/heartbeat` every 15s to keep the session active and signal online presence.

---

## Phase 5: Angular 19 Frontend - Consoles, Feed & Admin HUD
*Goal: Assemble the interactive user interfaces.*

- [x] **Task 5.1: Pulse Social Media Feed (`pulse-feed/`)**
  - Feed card component with dynamic like/share counts accented in `#F9A81C`.
  - Verified badges and prebunk shield indicators styled with `#84AA40`.
  - Threaded comment drawer showing simulated bot swarms and ADK influencer replies.
- [x] **Task 5.2: Tactical Action Consoles**
  - Red Team Console: Attack cards with cooldown indicators, bot swarm deployment, microtargeting, and deepfake generator modal.
  - Blue Team Console: Defense cards with prebunk target picker, evidence debunking tools, and velocity friction toggle.
- [x] **Task 5.3: Facilitator Master HUD (`admin-hud/`)**
  - Connected participant presence radar with heartbeat activity indicators.
  - Real-time token usage meter, budget gauges, and estimated USD cost readout.
  - God-mode controls: Start/Pause/Resume clock, Force Tick, and Emergency Crisis Inject broadcast modal.
- [x] **Task 5.4: Post-Game Debrief Scrubber (`debrief/`)**
  - Interactive timeline scrubber allowing students to step tick-by-tick through the contagion history.
  - Outcome victory banner (Adversary Decisive Victory, Defense Decisive Victory, Contested Stalemate).
  - Telemetry breakdown across platform trust, polarization, virality, and debunk rates.

---

## Phase 6: End-to-End Verification & Cloud Deployment
*Goal: Validate complete system and verify scale-to-zero.*

- [x] **Task 6.1: Automated Test Suite**
  - Backend `pytest` suite: 20 passing unit and integration tests covering Barabási-Albert network graph, bounded metric diffusion calculus, actions evaluator, token governor tiers, signed invites, session lifecycle, scale-to-zero auto-pause, Gemini ADK fallback, and full E2E scenario flow.
- [x] **Task 6.2: Container Build & Cloud Run Deploy Readiness**
  - Created multi-stage `Dockerfile` and `cloudbuild.yaml` in `backend/` for Cloud Run Gen2 deployment.
- [x] **Task 6.3: Static Asset Hosting**
  - Built Angular 19 production bundle (`npm run build`) in `frontend/dist/frontend`.
- [x] **Task 6.4: Live Simulation Smoke Test**
  - Verified end-to-end integration test (`test_e2e_scenario.py`) simulating complete session lifecycle:
    1. Session creation & status transitions.
    2. Signed invite token generation & magic link join.
    3. Adversary bot swarms & blue team evidence debunks.
    4. Discrete tick execution & feed status mutation.
    5. Real-time telemetry & presence tracking.

---

## How to Run & Verify

### 1. Running the Backend Test Suite
```bash
cd /home/admin_/info/backend
.venv/bin/pytest -v
```

### 2. Starting the Backend Service Locally
```bash
cd /home/admin_/info/backend
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Building & Serving the Angular Frontend
```bash
cd /home/admin_/info/frontend
npm run build
npm start
```
The app will be accessible at `http://localhost:4200` with routes:
- `/` - Session Lobby & Scenario Creator
- `/join` - Magic Link Token Join
- `/arena/:sessionId` - Main Operational Lab Arena (Pulse Feed & Consoles)
- `/admin/:sessionId` - Facilitator Master HUD & Telemetry Radar
- `/debrief/:sessionId` - Post-Exercise Analytical Scrubber
