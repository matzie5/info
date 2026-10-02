# Infosphere Lab Module

> **Interactive Multi-Player Simulation Engine for Digital Hygiene & Information Defense**

The **Infosphere Lab** is an interactive educational simulation platform designed to immerse learners in realistic, fast-paced scenarios modeling modern social media dynamics, algorithmic amplification, Coordinated Inauthentic Behavior (CIB), and strategic information countermeasures.

Built on an **Agent-Based Modeling (ABM)** architecture, the platform simulates a 500-node scale-free social network partitioned into ideological clusters, demonstrating the propagation of rumors, disinforming narratives, bot storms, and evidence-based debunks in real time.

---

## Table of Contents

- [Key Features](#key-features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Running the App Locally](#running-the-app-locally)
  - [1. Backend Setup (FastAPI)](#1-backend-setup-fastapi)
  - [2. Frontend Setup (Angular 19)](#2-frontend-setup-angular-19)
  - [3. Accessing the Application](#3-accessing-the-application)
- [Local Zero-Config & Mock Modes](#local-zero-config--mock-modes)
- [Running Tests](#running-tests)
- [Simulation Roles & Gameplay](#simulation-roles--gameplay)
- [API Endpoints Reference](#api-endpoints-reference)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [Docker & Containerized Execution](#docker--containerized-execution)
- [Production Cloud Deployment](#production-cloud-deployment)

---

## Key Features

- **Agent-Based Network Graph (ABM):** 500-node scale-free Barabási–Albert graph with clustering, divided into 5 demographic clusters (*Hyper-Partisan A*, *Hyper-Partisan B*, *Institutional Skeptics*, *Susceptible Neutrals*, *Apolitical Youth*).
- **Mathematical Diffusion Calculus:** Vectorized logistic sigmoid reshare probabilities modeling outrage, confirmation bias, prebunk shields, and fact-checking friction, yielding bounded metrics:
  - **Virality Index** (0–100)
  - **Polarization Score** (0–100)
  - **Institutional Trust Index** (0–100)
  - **Disinformation Reach** (0–100)
  - **Debunk Effectiveness** (0–100)
- **4 Built-in Crisis Scenarios (Bilingual PL/EN):**
  1. `poland-grid-panic-2026`: Polish Critical Power Grid Crisis (PSE Blackout rumors & winter coal shortfalls)
  2. `financial-panic-2026`: Banking Liquidity Panic & Cash Run (ATM withdrawal limits & payment network panic)
  3. `water-contamination-2026`: Municipal Water Supply Crisis (Reservoir contamination rumors)
  4. `border-security-2026`: Eastern Border Hybrid Incident (Drone incursions & GPS jamming rumors)
- **Role-Based Adversarial Gameplay:**
  - **Red Team (Adversary):** Deploy bot swarms (+300% virality velocity), synthesize AI deepfakes, microtarget ideological clusters, and flood feeds with astroturf comment storms.
  - **Blue Team (Defense):** Roll out proactive prebunk shields (inoculation), publish evidence debunks, adjust algorithmic velocity friction, and broadcast public crisis advisories.
  - **Facilitator (Instructor):** God-mode HUD with live telemetry radar, automatic 10-second tick loop, Quick Scenario Inject, Custom Post Studio, and AI Token Governor monitoring.
  - **Classroom Spectator (Observatory):** Fullscreen projector mode with real-time social feed, chronological operations log, dynamic SVG trajectory curves, and post-exercise debrief playback scrubber.
- **Interactive In-App Team Field Manual / Tutorial:**
  - Built-in 4-tab guidance modal for operative teams covering Mission & Victory Conditions, Adversary Playbook, Defense Countermeasures, and Resource Economy & Regeneration.
- **Resilient AI Pipeline:** High-speed LLM engine integration via ADK with strict JSON schema validation, backed by an offline bilingual seed library (English & Polish) and a 3-tier token budget circuit breaker.
- **Automatic 10-Second Simulation Loop:** Robust continuous background ticker executing network diffusion steps every 10 seconds (1 tick = 1 hour operational scenario time).
- **Frictionless Onboarding:** Cryptographically signed HMAC/JWT magic join links allow students to enter sessions instantly without account creation.
- **Full Localization (i18n):** Native English (`en`) and Polish (`pl`) language support for UI elements, game prompts, starter feeds, template injects, and debrief messages.

---

## Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│                   Angular 19 SPA                       │
│    (Signals, Tailwind CSS, Dark Theme, i18n EN/PL)     │
│                 http://localhost:4200                  │
│  Arena • Facilitator HUD • Classroom View • Debrief    │
└──────────────────────────┬─────────────────────────────┘
                           │ Reverse Proxy (/api -> :8000)
                           ▼
┌────────────────────────────────────────────────────────┐
│               FastAPI Simulation Engine                │
│                 http://localhost:8000                  │
├──────────────────────────┬─────────────────────────────┤
│  Agent-Based Graph (ABM) │  Diffusion & Metrics Engine │
│  (NetworkX + NumPy)      │  (Sigmoid Propagation)      │
├──────────────────────────┼─────────────────────────────┤
│  Token Governor          │  Frictionless Magic Links   │
│  & Seed Library (4 Scen) │  (HMAC / JWT Signed Tokens) │
└──────────────────────────┴─────────────────────────────┘
```

- **Frontend:** Angular 19, TypeScript 5.7, Tailwind CSS 3.4, RxJS, Lato Typography
- **Backend:** Python 3.12, FastAPI, Uvicorn, Pydantic v2, NetworkX, NumPy, PyJWT
- **Cloud Infrastructure (Target Cloud Run / GCP):** Cloud Run Gen2, Cloud Firestore (Native Mode), Cloud Tasks, Cloud Pub/Sub, Vertex AI, Cloud Storage, Terraform

---

## Repository Structure

```
info/
├── README.md                      # Comprehensive documentation & setup guide
├── IMPLEMENTATION_PLAN.md         # Detailed milestone & engineering plan
├── TECHNICAL_SPECIFICATION.md     # Full architectural specification
├── backend/                       # FastAPI simulation service
│   ├── Dockerfile                 # Container image specification
│   ├── requirements.txt           # Python dependencies
│   ├── pytest.ini                 # Pytest configuration
│   ├── app/
│   │   ├── main.py                # FastAPI entry point & CORS configuration
│   │   ├── config.py              # Environment settings (Pydantic BaseSettings)
│   │   ├── api/v1/                # REST endpoints (sessions, actions, admin, invites, ticks)
│   │   ├── engine/                # ABM network graph, calculus, orchestrator, governor
│   │   ├── ai/                    # ADK service, seed library (4 scenarios), schemas
│   │   ├── models/                # Pydantic data schemas (Session, Feed, Actions)
│   │   └── services/              # Firestore, Cloud Tasks, and Auth service layers
│   └── tests/                     # Unit and E2E integration tests (20 tests passed)
├── frontend/                      # Angular 19 single-page application
│   ├── package.json               # Node.js dependencies and scripts
│   ├── angular.json               # Angular CLI configuration
│   ├── proxy.conf.json            # Development reverse proxy configuration
│   ├── tailwind.config.js         # Tailwind theme & accent colors
│   └── src/
│       ├── app/
│       │   ├── core/              # Sync services, API clients, models, i18n
│       │   └── features/          # Lobby, Join, Arena, Admin HUD, Classroom, Debrief
│       └── styles.css             # Dark theme design system & CSS variables
└── terraform/                     # Cloud Platform IaC modules
```

---

## Prerequisites

Ensure you have the following installed on your local workstation:

1. **Python 3.12+**
2. **Node.js 18.x or 20.x** and **npm**
3. *(Optional)* **Docker** for containerized testing
4. *(Optional)* **Google Cloud SDK (`gcloud`)** if connecting to live GCP resources

---

## Running the App Locally

Running the application locally does **not** require an active Google Cloud project or Firestore database. Both the backend and frontend include automatic local fallback modes.

### 1. Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment (if not already created):
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend development server on **port 8000**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

   > **Note:** Port `8000` matches the Angular development reverse proxy (`frontend/proxy.conf.json`).

5. Verify that the backend is responding:
   ```bash
   curl http://localhost:8000/healthz
   # Expected response: {"status":"ok","service":"infosphere-simulation-api",...}
   ```
   Interactive Swagger documentation is available at `http://localhost:8000/docs`.

---

### 2. Frontend Setup (Angular 19)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Launch the Angular development server:
   ```bash
   npm start
   ```
   This runs:
   ```bash
   ng serve --proxy-config proxy.conf.json --host 0.0.0.0 --disable-host-check
   ```

---

### 3. Accessing the Application

Open your browser and navigate to:
```
http://localhost:4200
```

#### Application Routes:
- **`/`** — **Lobby & Scenario Creator:** Create new sessions with scenario picker (4 scenarios) and language selector (`pl` / `en`).
- **`/join?token=...&sessionId=...`** — **Magic Link Join:** Automatic onboarding for participants via signed tokens.
- **`/arena/:sessionId`** — **Lab Arena:** Main multi-player battlefield featuring the live Pulse Feed, Red/Blue Tactical Consoles, and the interactive **Field Manual / Tutorial**.
- **`/admin/:sessionId`** — **Facilitator Master HUD:** Live participant presence radar, God-mode controls (Force Tick, Pause/Resume), Scenario Injector, and Custom Post Studio.
- **`/classroom/:sessionId`** — **Classroom Observatory & Playback:** High-contrast 3-column projector view with Live Feed, Tactical Operations Log, dynamic SVG Trajectory curves, and debrief playback scrubber.
- **`/debrief/:sessionId`** — **Post-Exercise Debrief:** Interactive tick scrubber, victory outcome banners, and macro metric timelines.

---

## Local Zero-Config & Mock Modes

When executing locally without cloud credentials:

- **In-Memory Firestore:** `FirestoreService` automatically detects if cloud credentials are unavailable and switches seamlessly to an in-memory dictionary store. Sessions, actions, and feed items persist for the lifespan of the backend process.
- **Automatic Background Tick Loop:** When running locally, the simulation loop advances ticks every 10 seconds asynchronously without crashing, safely checking player heartbeats and updating state. You can also manually trigger ticks via the **Force Tick** button in the Facilitator HUD or via API.
- **Offline Seed Library:** If an external LLM API key is not configured, the engine automatically serves pre-generated synthetic headlines, persona comments, bot storms, and scenario injects in both English and Polish across all 4 operational scenarios.

*(Optional)* To test live AI text generation locally, export your API key before starting uvicorn:
```bash
export GEMINI_API_KEY="your-api-key"
```

---

## Running Tests

### Backend Test Suite
The backend contains 20 unit and integration tests covering the ABM graph, bounded diffusion mathematics, signed magic tokens, session lifecycle, token circuit breaker, and full end-to-end scenario flow.

```bash
cd backend
.venv/bin/pytest -v
```

### Frontend Build Verification
Verify that the Angular application compiles cleanly into production bundles:

```bash
cd frontend
npm run build
```

---

## Simulation Roles & Gameplay

### 1. Facilitator (Admin)
- Access via `/admin/:sessionId`
- Start, Pause, or Resume the simulation clock.
- Trigger manual **Force Tick** requests to advance the state by 1 game hour.
- **Scenario Injects & Custom Post Studio:**
  - Inject curated scenario articles into the live feed with 1 click.
  - Author custom breaking posts with custom outrage scores, bias scores, and demographic cluster targeting.
- Monitor student activity, network polarization, and AI Engine Token Governor consumption.

### 2. Red Team (Adversary Cell)
- Access via `/arena/:sessionId` (select or redeem Red Team role).
- Consult the in-app **📖 Field Manual / Tutorial** for strategies and cooldowns.
- **Deploy Bot Swarm:** Amplify divisive narratives across target clusters (+300% virality velocity).
- **Microtarget Cluster:** Exploit ideological vulnerabilities in specific demographic groups.
- **Astroturf Comment Storm:** Flood the Pulse feed with synthetic outrage comments to shift undecided nodes.
- **AI Deepfake Article:** Generate and distribute persuasive spoofed media.

### 3. Blue Team (Information Defense)
- Access via `/arena/:sessionId` (select or redeem Blue Team role).
- Consult the in-app **📖 Field Manual / Tutorial** for defense countermeasures.
- **Prebunk Campaign:** Proactively inoculate susceptible clusters before rumors spread, building cognitive resistance.
- **Evidence Debunk:** Publish verified fact-checks against trending disinformation posts to reduce transmission.
- **Algorithmic Velocity Friction:** Dampen viral reshare multipliers across the platform.
- **Public Advisory:** Release institutional crisis advisories to restore platform trust network-wide.

### 4. Classroom Spectator (Observatory & Debrief)
- Access via `/classroom/:sessionId` (ideal for projector display during exercises).
- **Live Observatory Mode:** Displays incoming social posts, real-time tactical actions, and live contagion trajectories.
- **Debrief Playback Mode:** Scrubber allowing facilitators and students to step backward/forward through ticks `T+0` to `T+now` or auto-playback to analyze cause-and-effect of specific actions.

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/healthz` | Container health probe |
| `GET` | `/api/v1/health` | Service health and active project configuration |
| `GET` | `/api/v1/admin/scenarios` | List all 4 available crisis scenarios with PL/EN descriptions |
| `POST` | `/api/v1/sessions` | Create a new simulation session (`scenario_id`, `language`, `max_ticks`) |
| `GET` | `/api/v1/sessions/{id}` | Retrieve session details, current status, and metrics |
| `POST` | `/api/v1/sessions/{id}/start` | Transition session from `LOBBY` to `ACTIVE` and launch ticker |
| `POST` | `/api/v1/sessions/{id}/pause` | Pause simulation clock |
| `POST` | `/api/v1/sessions/{id}/resume` | Resume active simulation clock |
| `POST` | `/api/v1/sessions/{id}/heartbeat` | Report player presence and update active session lease |
| `POST` | `/api/v1/sessions/{id}/invites` | Generate signed magic invite URL for a team role |
| `POST` | `/api/v1/sessions/{id}/join-by-token` | Redeem signed invite token and acquire role |
| `GET` | `/api/v1/sessions/{id}/feed` | Fetch feed items and threaded comments |
| `POST` | `/api/v1/sessions/{id}/feed` | Post custom content to the simulation feed |
| `POST` | `/api/v1/sessions/{id}/actions` | Submit tactical team action (Red or Blue) |
| `GET` | `/api/v1/sessions/{id}/actions` | List all actions executed in the session chronologically |
| `POST` | `/api/v1/sessions/{id}/tick` | Execute discrete simulation step (ABM diffusion cycle) |
| `GET` | `/api/v1/admin/sessions/{id}/scenario-articles` | Retrieve template inject articles for the session scenario |
| `POST` | `/api/v1/admin/sessions/{id}/posts` | Facilitator injects post into live session feed |
| `POST` | `/api/v1/admin/sessions/{id}/force-tick` | Manually force simulation clock advance by 1 tick |
| `POST` | `/api/v1/admin/sessions/{id}/inject` | Facilitator crisis intervention inject |
| `GET` | `/api/v1/admin/sessions/{id}/telemetry`| Detailed audience graph node states & token telemetry |

---

## Configuration & Environment Variables

Settings are managed via Pydantic BaseSettings in `backend/app/config.py`. You can configure them via shell environment variables or a `.env` file in `backend/`:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PROJECT_ID` | `infosphere-511` | Target GCP project identifier |
| `REGION` | `europe-west1` | GCP region for Cloud Run, Cloud Tasks, and Vertex AI |
| `ASSETS_BUCKET` | `infosphere-511-infosphere-assets` | Cloud Storage bucket for media assets |
| `CLOUD_TASKS_QUEUE`| `projects/.../queues/simulation-ticks-queue` | Cloud Tasks queue path |
| `JWT_SECRET` | *internal key* | HMAC secret key used for signing magic invite tokens |
| `TICK_INTERVAL_SECONDS` | `10` | Frequency of simulation clock ticks in seconds |
| `INACTIVITY_TIMEOUT_SECONDS` | `60` | Auto-pause threshold when no active player heartbeats exist |
| `DEFAULT_SIMULATION_NODES` | `500` | Number of persona nodes in the Barabási–Albert graph |
| `SERVICE_URL` | `""` | Public URL of Cloud Run service (used by Cloud Tasks) |
| `GEMINI_API_KEY` | `""` | Optional Google GenAI API key for live LLM generation |

---

## Docker & Containerized Execution

To build and run the backend inside a container matching the Cloud Run environment:

1. **Build the container:**
   ```bash
   cd backend
   docker build -t infosphere-backend .
   ```

2. **Run the container:**
   ```bash
   docker run -p 8080:8080 -e PORT=8080 infosphere-backend
   ```

3. **Check health:**
   ```bash
   curl http://localhost:8080/healthz
   ```

---

## Production Cloud Deployment

Infrastructure is automated with Terraform in the `terraform/` directory:

1. **Authenticate to Google Cloud:**
   ```bash
   gcloud auth login
   gcloud config set project infosphere-511
   ```

2. **Deploy Infrastructure:**
   ```bash
   cd terraform
   terraform init
   terraform apply
   ```

3. **Deploy Backend to Cloud Run:**
   Submit the build via Cloud Build:
   ```bash
   cd backend
   gcloud builds submit --config cloudbuild.yaml .
   ```
