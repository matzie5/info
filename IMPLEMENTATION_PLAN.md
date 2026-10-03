# Infosphere Digital Hygiene Platform (`v3.0.0`) — End-to-End Implementation Plan

> **Comprehensive Strangler-Fig Migration Plan from Single-Module Game (`v2.1.0`) to 5-Module Enterprise Platform (`v3.0.0`)**  
> *Google ADK • Keyless Vertex AI ADC • DeepSeek LiteLLM • Hybrid RAG • STIX 2.1 • Scale-to-Zero Serverless*

---

## Architectural Mandates & Quality Gates

This implementation plan governs the end-to-end upgrade of Infosphere to the **5-Module Digital Hygiene Platform (`v3.0.0`)**:
1. **Google ADK-First**: All agent workflows utilize `google-adk` (`LlmAgent`, `SequentialAgent`, `FunctionTool`, `InMemoryRunner`) with strict Pydantic v2 schemas.
2. **Keyless Vertex AI ADC**: Direct static API keys are eliminated. All Gemini generation and `text-embedding-004` calls authenticate via keyless Vertex AI Application Default Credentials (`GOOGLE_GENAI_USE_VERTEXAI=TRUE`).
3. **Pluggable DeepSeek LiteLLM**: Module 2 dynamically switches adversarial operative models between Vertex AI Gemini and DeepSeek (`deepseek/deepseek-chat`, `deepseek/deepseek-reasoner`) via Cloud Secret Manager.
4. **Hybrid Multi-Corpus RAG**: In-memory BM25 + Dense Cosine Similarity + Reciprocal Rank Fusion ($k=60$) + Grounded Citation Verification.
5. **Zero `[ORPHAN CODE]`**: Every service, module, and endpoint is imported, mounted in `backend/app/main.py`, and verified by automated tests.
6. **Deterministic Offline Fallbacks**: All generative, embedding, and cloud calls include deterministic zero-credential fallbacks so CI/CD passes 100% offline.

---

## Phase 0: Pre-Flight Baseline Audit & Environment Preparation

- [x] **Task 0.1: Baseline Audit & Authorship Verification**
  - Inspected repository root (`backend/`, `frontend/`, `terraform/`, documentation).
  - Verified Git commit configuration and baseline test execution.
- [x] **Task 0.2: Dependency & Packaging Modernization**
  - Updated `backend/requirements.txt` with `google-adk`, `google-genai`, `litellm`, `google-cloud-secret-manager`, `opentelemetry-api`, `opentelemetry-sdk`, `pydantic>=2.7.0`, `fastapi>=0.115.0`.
  - Configured `backend/pytest.ini` for strict asyncio execution.

---

## Phase 1: Platform Core Foundation & Persistence (`backend/app/platform/`)

- [x] **Task 1.1: Platform Plugin Registry (`app/platform/plugin_registry.py`)**
  - Defined `DigitalHygieneModulePlugin` abstract base class and `ModuleMetadata` Pydantic model.
  - Implemented dynamic registration and endpoint mounting via `platform_registry.mount_all_routers(app, base_prefix="/api/v1/modules")`.
  - Added golden evaluation case collection (`collect_all_eval_cases()`).
- [x] **Task 1.2: Google ADK Runtime & Model Router (`app/platform/adk_runtime.py`)**
  - Implemented `ADKRuntimeService` managing keyless Vertex AI ADC (`genai.Client(vertexai=True)`).
  - Integrated `LiteLlm` model adapter for DeepSeek external models (`deepseek/deepseek-chat`, `deepseek/deepseek-reasoner`).
  - Added Secret Manager client fetching `DEEPSEEK_API_KEY` dynamically.
  - Built 3-state circuit breaker (`APICircuitBreaker`: `CLOSED`, `OPEN`, `HALF_OPEN`) with 30s recovery timeout.
  - Added deterministic zero-credential fallback generators for all Pydantic response contracts.
- [x] **Task 1.3: Multi-Corpus Hybrid RAG Engine (`app/platform/rag_engine.py`)**
  - Implemented tokenized sparse BM25 scoring with domain term frequency and IDF calculations.
  - Implemented dense vector cosine similarity using Vertex AI `text-embedding-004` (768 dimensions) with deterministic fallback projection.
  - Implemented Reciprocal Rank Fusion (RRF with $k=60$):
    $$\text{RRF\_Score}(d) = \frac{1}{60 + \text{rank}_{\text{BM25}}(d)} + \frac{1}{60 + \text{rank}_{\text{Dense}}(d)}$$
  - Populated authoritative default corpora from PSE, NASK / CERT Polska, CSIRT KNF, ENISA, and EU DSA.
  - Implemented deterministic citation verification (`verify_citations`) enforcing bracketed reference validation.
- [x] **Task 1.4: DLP Guardrail & Injection Firewall (`app/platform/dlp_guardrail.py`)**
  - Implemented prompt-injection pattern matching against jailbreak overrides and exploit requests.
  - Implemented automated PII redaction patterns: Polish PESEL, US SSN, IBAN, email addresses, phone numbers, and GPS EXIF coordinates.
- [x] **Task 1.5: Digital Hygiene Passport Service (`app/platform/passport_service.py`)**
  - Implemented multi-dimensional diagnostic score aggregation across all 5 operational modules.
  - Evaluated maturity tiers: `HIGH_EXPOSURE_RISK` ($<60$), `AWARE_OPERATOR` ($60\text{--}79.9$), `RESILIENT_DEFENDER` ($\ge 80$).
  - Implemented OASIS STIX 2.1 JSON bundle export (`export_stix21_bundle`).
- [x] **Task 1.6: Platform Telemetry & Pub/Sub Task Dispatcher (`app/platform/telemetry.py`)**
  - Configured OpenTelemetry tracer provider.
  - Implemented sliding-window latency percentile tracker (P50, P95, P99).
  - Implemented asynchronous task publishing to Cloud Pub/Sub topic `session-ai-tasks` with offline fallback queue.
- [x] **Task 1.7: Cloud Tasks OIDC Authentication & Dual-Key JWT Rotation**
  - Updated `app/services/auth_service.py` to support dual-key JWT rotation (`JWT_SECRET` and `JWT_PREVIOUS_SECRET`).
  - Implemented `verify_oidc_tick_token` in `app/services/auth_service.py` verifying Google Cloud OIDC tokens on `POST /api/v1/sessions/{id}/tick`.
  - Updated `app/services/cloud_tasks_service.py` to attach OIDC tokens bound to `infosphere-engine-sa`.
  - Implemented `AudienceNetwork` snapshot persistence and restoration in `app/services/firestore_service.py` across scale-to-zero restarts.

---

## Phase 2: 5-Module Backend Implementation (`backend/app/modules/`)

- [x] **Task 2.1: Module 1: Macro Disinformation ABM Lab (`m1_disinfo`)**
  - Wrapped legacy simulation engine into modular plugin architecture.
  - Maintained 500-node scale-free Barabási–Albert graph, vectorized sigmoid propagation calculus, and 4 bilingual crisis scenarios.
  - Enforced Token Governor 3-tier budget checking before invoking ADK commentary.
  - Registered plugin under prefix `m1-disinfo`.
- [x] **Task 2.2: Module 2: Scam & Phishing Resilience Lab (`m2_scam_lab`)**
  - Implemented interactive multi-turn BEC and AiTM phishing drill simulator.
  - Integrated 3 ADK FunctionTools: `inspect_sender_headers`, `lookup_domain_whois`, `verify_out_of_band_callback`.
  - Built multi-provider model router allowing learners to face Vertex AI Gemini or DeepSeek (`deepseek/deepseek-chat`, `deepseek/deepseek-reasoner`).
  - Added governed defensive `ResilienceCoachAgent` (`gemini-2.5-pro` at temperature 0.0) grading turns with grounded citations `[ENISA-BEC-2026-01]`, `[CSIRT-KNF-2026-MFA]`.
  - Registered plugin under prefix `m2-scam`.
- [x] **Task 2.3: Module 3: Deepfake & Synthetic Media Literacy Lab (`m3_deepfake_lab`)**
  - Curated audiovisual catalog of authentic and synthetic media artifacts.
  - Implemented C2PA cryptographic signature status checks (`VALID_SIGNED`, `STRIPPED_OR_MISSING`, `TAMPERED_SIGNATURE`) and Google SynthID frequency analysis.
  - Built ADK SequentialAgent pipeline: `ProvenanceValidatorAgent` $\to$ `VisualAcousticForensicsAgent` $\to$ `DebunkBriefingAgent`.
  - Registered plugin under prefix `m3-deepfake`.
- [x] **Task 2.4: Module 4: OSINT & Exposure Management Lab (`m4_osint_exposure`)**
  - Implemented public profile metadata ingestion.
  - Integrated automated `DLPGuardrailService` sanitizing sensitive PII and EXIF coordinates.
  - Built ADK SequentialAgent pipeline: `HarvesterAgent` $\to$ `SpearPhishPretextAgent` $\to$ `DLPRemediationAgent`.
  - Formulated remediation checklist grounded in `[NASK-OSINT-2026]` and GDPR Article 5.
  - Registered plugin under prefix `m4-osint`.
- [x] **Task 2.5: Module 5: Algorithmic Manipulation & Echo Chambers Lab (`m5_algo_echo`)**
  - Built vectorized candidate post pool scored via dense text embeddings (`text-embedding-004`).
  - Implemented adjustable parameter weighting ($W_{\text{outrage}}$, $W_{\text{affinity}}$, $W_{\text{bridging}}$).
  - Implemented mathematical Shannon Viewpoint Entropy calculation and Echo Chamber Radius metric.
  - Integrated EU Digital Services Act (DSA) Articles 27 & 38 compliance citations.
  - Registered plugin under prefix `m5-echo`.

---

## Phase 3: Platform Integration & Application Entry Point (`backend/app/main.py`)

- [x] **Task 3.1: Unified Routing & Strangler-Fig Mount**
  - Mounted legacy simulation routers (`sessions`, `invites`, `actions`, `simulation`, `admin`) under `/api/v1` for 100% backward compatibility.
  - Mounted all 5 modular domain routers via `platform_registry.mount_all_routers(app, base_prefix="/api/v1/modules")`.
- [x] **Task 3.2: Security Headers & Core Endpoints**
  - Added HTTP middleware enforcing `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Strict-Transport-Security`.
  - Exposed `/healthz` and `/readyz` probes reporting module registry counts, RAG chunks, and latency percentiles.
  - Exposed `/api/v1/platform/modules`, `/api/v1/platform/passport/{subject_id}`, and `/api/v1/platform/passport/{subject_id}/stix21`.

---

## Phase 4: Angular 19 Modular Frontend (`frontend/src/app/`)

- [x] **Task 4.1: Platform Shell & Unified Navigation (`platform-shell/`)**
  - Implemented standalone `PlatformShellComponent` featuring top navigation bar and live Digital Hygiene Passport maturity HUD.
- [x] **Task 4.2: Lazy-Loaded Module Routing (`app.routes.ts`)**
  - Configured lazy loading for `/modules/scam-lab`, `/modules/deepfake-lab`, `/modules/osint-exposure`, and `/modules/echo-chamber`.
  - Maintained root routes for `/`, `/arena/:sessionId`, `/admin/:sessionId`, `/classroom/:sessionId`, `/debrief/:sessionId`, and `/join`.
- [x] **Task 4.3: Specialized Module Views**
  - `M2ScamLabComponent`: Multi-turn chat interface with adversary model selector and interactive forensic tool buttons.
  - `M3DeepfakeLabComponent`: Visual forensic inspector displaying C2PA status badges, SynthID indicators, and debunk briefings.
  - `M4OsintLabComponent`: OSINT exposure analyzer showing real-time PII redactions, attacker pretext previews, and remediation checklists.
  - `M5EchoLabComponent`: Recommender tuning sandbox with sliders for outrage, affinity, and bridging weights, displaying live Shannon entropy gauges.
- [x] **Task 4.4: Real-Time Firestore Synchronization (`firestore-sync.service.ts`)**
  - Upgraded Firestore sync service to utilize real-time `onSnapshot` streaming with automatic graceful fallback to adaptive polling.

---

## Phase 5: Infrastructure as Code, Containerization & Architecture Decision Records

- [x] **Task 5.1: Multi-Environment Terraform Configuration (`terraform/`)**
  - Created environment parameter files: `environments/dev.tfvars`, `staging.tfvars`, `prod.tfvars`.
  - Configured Cloud Run Gen2 service, Cloud Tasks queue, Cloud Pub/Sub topic, Cloud Storage bucket, and IAM service accounts.
- [x] **Task 5.2: Multi-Stage Dockerfile & Cloud Build Pipeline**
  - Optimized `backend/Dockerfile` using `python:3.12-slim` (<90MB base) with non-root security context.
  - Codified automated continuous delivery in `backend/cloudbuild.yaml`.
- [x] **Task 5.3: Architecture Decision Records (`docs/adr/`)**
  - Documented ADR 001: Hybrid ABM & ADK Multi-Agent Orchestration.
  - Documented ADR 002: Keyless Vertex AI ADC & Pluggable DeepSeek LiteLLM.
  - Documented ADR 003: Cloud Tasks Scale-to-Zero Clock vs Scheduler/WebSockets.
  - Documented ADR 004: Multi-Corpus Hybrid BM25 + Vertex Embedding RRF RAG.
  - Documented ADR 005: Strangler-Fig Migration to 5-Module Plugin Platform.

---

## Phase 6: Automated Testing, Golden Evaluation & Documentation Synchronization

- [x] **Task 6.1: Unit & Integration Test Execution**
  - Executed 44 passing unit, integration, and golden eval tests covering ABM graph, bounded diffusion math, token governor, signed invites, and tick lifecycle.
- [x] **Task 6.2: OpenAPI 3.1 Schema Export (`docs/openapi.json`)**
  - Exported complete OpenAPI 3.1 schema directly from the live FastAPI application:
    ```bash
    PYTHONPATH=backend backend/.venv/bin/python -c "import json; from app.main import app; open('docs/openapi.json', 'w').write(json.dumps(app.openapi(), indent=2))"
    ```
  - Verified schema validity and endpoint coverage (`test -s docs/openapi.json`).
- [x] **Task 6.3: Documentation Synchronization**
  - Synchronized `README.md`, `TECHNICAL_SPECIFICATION.md`, and `IMPLEMENTATION_PLAN.md` with the 5-module v3.0.0 architecture, Keyless Vertex AI ADC, DeepSeek LiteLLM, Hybrid RAG, STIX 2.1 Passport, and performance benchmarks.

---

## Phase 7: Architectural Redesign — Role Separation, Cohorts, Individual Logins & Gamification

### 1. Identity & Role-Based Access Control (RBAC) Architecture
- [ ] **Task 7.1: User Accounts & Authentication Engine (`backend/app/services/user_service.py`, `backend/app/api/v1/auth.py`)**
  - Implement `User` model with salted password hashing, roles (`ADMIN` vs `PLAYER`), and cohort membership.
  - Implement endpoints: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, and `GET /api/v1/auth/demo-users`.
  - Issue cryptographically signed JWT tokens with claims (`sub`, `username`, `role`, `cohort_id`).
  - Provide pre-seeded test accounts: `admin` (`ADMIN`), `player1` (`PLAYER`), `player2` (`PLAYER`).

### 2. Cohort Play Configuration Architecture
- [ ] **Task 7.2: Cohort Management Engine (`backend/app/services/cohort_service.py`, `backend/app/api/v1/cohorts.py`)**
  - Implement `Cohort` model containing play configuration (`module_configs` for M1–M5), points rewards, pass thresholds, and enrolled player rosters.
  - Implement Admin endpoints:
    - `POST /api/v1/cohorts` (create cohort)
    - `GET /api/v1/cohorts` (list cohorts with role-based filtering)
    - `GET /api/v1/cohorts/{cohort_id}` (cohort details & play configuration)
    - `PUT /api/v1/cohorts/{cohort_id}/config` (update module play configuration)
    - `POST /api/v1/cohorts/{cohort_id}/members` (assign players to cohort)
    - `GET /api/v1/cohorts/{cohort_id}/analytics` (aggregate cohort progress, completion percentages, average scores)
    - `GET /api/v1/cohorts/{cohort_id}/leaderboard` (cohort leaderboard ranked by points)

### 3. Points Collection & Progress Tracking (Gamification & Passport)
- [ ] **Task 7.3: Points & Progress Tracking Engine (`backend/app/services/progress_service.py`, `backend/app/api/v1/progress.py`)**
  - Implement `UserProgress` model tracking total points, completed modules, best scores, attempt counts, and earned cyber defense badges.
  - Implement `POST /api/v1/users/{user_id}/modules/{module_id}/complete`:
    - Evaluates exercise score against cohort configuration.
    - Awards module points and unlocks badges (`SCAM_RESILIENT`, `SYNTHID_FORENSIC`, `DLP_GUARDIAN`, `ECHO_CHAMBER_BREAKER`, `DISINFO_DEFENDER`).
    - Synchronizes directly with `DigitalHygienePassportService` to update the user's STIX 2.1 passport.
  - Implement `GET /api/v1/users/{user_id}/progress` returning live player progress.

### 4. Frontend Role Separation & User Dashboards
- [ ] **Task 7.4: Angular Authentication & Role Service (`frontend/src/app/core/auth/auth.service.ts`)**
  - Reactive `AuthService` managing `currentUser`, `isLoggedIn`, `isAdmin`, `isPlayer`, JWT token persistence, and HTTP Bearer token injection.
  - Demo user switcher allowing seamless 1-click toggling between Admin and Player roles.
- [ ] **Task 7.5: Player Progress Dashboard (`frontend/src/app/features/dashboard/player-dashboard.component.ts`)**
  - Dedicated Player Dashboard route `/dashboard` displaying:
    - Points accumulator & completion progress bar across all 5 modules.
    - 5 Interactive Module Challenge cards with live status (✓ COMPLETED, IN PROGRESS, NOT STARTED), points earned, and direct launch actions.
    - Cyber Defense Badges trophy gallery.
    - Cohort Leaderboard preview.
    - Digital Hygiene Passport posture summary with STIX 2.1 bundle export.
- [ ] **Task 7.6: Admin Cohort Console (`frontend/src/app/features/admin/admin-cohorts.component.ts`)**
  - Dedicated Admin Console route `/admin/cohorts` displaying:
    - Cohort creator and selector.
    - Play Configuration Editor: customize points, pass score thresholds, allowed AI models, and scenario parameters for each module for the cohort.
    - Cohort Telemetry & Analytics: completion percentages per module, score distribution, and enrolled player roster.
- [ ] **Task 7.7: Platform Shell & Module Role-Separation Integration**
  - Update `PlatformShellComponent` header with user identity badge, role pill, points badge, and cohort indicator.
  - Dynamic role-based navigation tabs:
    - Player: `Dashboard`, `M1 Disinfo`, `M2 Scam`, `M3 Deepfake`, `M4 OSINT`, `M5 Echo`.
    - Admin: `Cohort Console`, `Cohort Analytics`, `Modules Preview`.
  - Add in-module point claiming feedback in M1–M5 allowing players to submit drills and collect points toward their cohort progress.

---

## How to Verify the Implementation

```bash
# 1. Verify backend pytest suite with new Auth, Cohort, and Progress tests
PYTHONPATH=backend backend/.venv/bin/pytest backend/tests/ -v

# 2. Verify Angular build & specs
npm --prefix frontend run build
npx --prefix frontend tsc --project frontend/tsconfig.spec.json --noEmit

# 3. Verify static OpenAPI 3.1 specification artifact includes new auth, cohort, and progress endpoints
PYTHONPATH=backend backend/.venv/bin/python -c "import json; from app.main import app; open('docs/openapi.json', 'w').write(json.dumps(app.openapi(), indent=2))"
test -s docs/openapi.json && grep -q "/api/v1/cohorts" docs/openapi.json && grep -q "/api/v1/auth" docs/openapi.json && echo "OpenAPI 3.1 schema valid."
```
