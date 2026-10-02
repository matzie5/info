# Infosphere Frontend (Angular 19)

> **Single-Page Application for Strategic Information Defense & Simulation Exercises**

The frontend is a modern Angular 19 application built with standalone components, signals, Tailwind CSS, and full native bilingual support (English & Polish). It provides real-time interfaces for participants (Red Team and Blue Team), instructors (Facilitator Admin HUD), and classrooms (Classroom Observatory Projector).

---

## Features & Views

### 1. Lobby & Scenario Creator (`/`)
- **4 Operational Scenarios:** Facilitator selects from 4 realistic crisis drills:
  1. `poland-grid-panic-2026`: Polish Critical Power Grid Crisis (PSE Blackouts)
  2. `financial-panic-2026`: Banking Liquidity Panic & Cash Run
  3. `water-contamination-2026`: Municipal Water Supply Crisis
  4. `border-security-2026`: Eastern Border Hybrid Incident
- **Language Switcher:** Selects initial session language (`pl` or `en`) with dynamic descriptions.
- **Role Selection:** Direct jump into Red Team, Blue Team, Facilitator, or Classroom View.

### 2. Lab Arena (`/arena/:sessionId`)
- **Interactive Social Feed (Pulse):** Displays real-time posts, algorithmic virality velocity, bot swarm badges, fact-check tags, and prebunk shields.
- **Red Team Console:** Deploy bot swarms (+300% virality), synthesize AI deepfakes, microtarget demographic clusters, and flood feeds with astroturf comments.
- **Blue Team Console:** Launch prebunk inoculation campaigns, attach evidence debunks, activate algorithmic velocity friction, and publish public crisis advisories.
- **Interactive Team Field Manual / Tutorial (`📖 Field Manual`):**
  - Modal with 4 bilingual tabs: Mission & Victory Conditions, Adversary Playbook, Defense Countermeasures, and Resource Economy & Regeneration.

### 3. Facilitator Master HUD (`/admin/:sessionId`)
- **God-Mode Controls:** Pause, resume, and manually force ticks.
- **Add / Inject Post Modal:**
  - **Quick Scenario Inject:** 1-click publishing of pre-configured scenario template articles.
  - **Custom Post Studio:** Author custom breaking posts with headline, body, author, outrage score, bias score, and demographic cluster targeting.
- **Participant Presence Radar:** Real-time monitoring of connected student roles and heartbeat activity.
- **AI Engine Token Governor:** Real-time token consumption meter with circuit breaker status.

### 4. Classroom Observatory & Debrief Playback (`/classroom/:sessionId`)
- **Projector Mode:** Optimized high-contrast 3-column layout:
  - **Column 1 (Pulse Social Feed):** Chronological stream of network posts with outrage indicators.
  - **Column 2 (Tactical Operations Log):** Live stream of Red, Blue, and Facilitator actions with team filters (`All`, `Red`, `Blue`).
  - **Column 3 (Strategic Contagion Trajectory):** Dynamic SVG multi-curve trajectory plotting Platform Trust (green), Polarization Index (red), and Virality Velocity (amber), alongside demographic cluster vulnerability meters.
- **Dual Modes:**
  - **LIVE:** Auto-updates as ticks advance.
  - **PLAYBACK:** Scrubber (`T+0` to `T+now`) with Play/Pause auto-stepping and Step Backward/Forward controls to analyze how specific events shifted platform metrics during debriefs.
  - Fullscreen toggle (`⛶`) for classroom projectors.

### 5. Debrief & Analytics (`/debrief/:sessionId`)
- Victory banners and detailed outcome analysis.
- Macro metric progression timelines.

---

## Project Structure

```
frontend/src/app/
├── app.routes.ts                    # Routes (/, /join, /arena/:id, /admin/:id, /classroom/:id, /debrief/:id)
├── core/
│   ├── i18n/
│   │   └── locale.service.ts        # Signal-based translation service (PL & EN)
│   ├── models/
│   │   └── session.model.ts         # Session, FeedItem, PlayerAction, Metrics interfaces
│   └── services/
│       ├── lab-api.service.ts       # REST client for backend FastAPI endpoints
│       └── firestore-sync.service.ts# Polling and state synchronization service
└── features/
    ├── lobby/                       # LobbyComponent (scenario selector, language toggle)
    ├── admin-hud/                   # AdminHudComponent (God-mode, Post Studio, Token Governor)
    ├── classroom/                   # ClassroomComponent (3-column projector view & playback scrubber)
    ├── debrief/                     # DebriefComponent (post-exercise analytics)
    ├── join/                        # JoinComponent (magic token redemption)
    └── lab-arena/
        ├── arena.component.ts       # Main operative battlefield
        └── components/
            ├── tutorial-modal/      # TutorialModalComponent (4-tab bilingual field manual)
            ├── pulse-feed/          # Social feed, post cards, threaded comments
            ├── red-console/         # Adversary actions
            ├── blue-console/        # Defense actions
            └── telemetry-hud/       # Real-time KPI gauges
```

---

## Internationalization (i18n)

Translations are maintained in standard JSON dictionaries in `public/assets/i18n/`:
- `en.json` (English)
- `pl.json` (Polish)

Both dictionaries cover `app`, `nav`, `roles`, `metrics`, `lobby`, `pulse`, `actions`, `admin`, `classroom`, `tutorial`, and `debrief`. The active language is saved to `localStorage` and managed reactively via Angular signals in `LocaleService`.

---

## Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm start
# or: ng serve --proxy-config proxy.conf.json --host 0.0.0.0 --disable-host-check
```

The application will be accessible at `http://localhost:4200/`. API requests to `/api/*` and `/healthz` are automatically proxied to the backend at `http://localhost:8000/`.

### 3. Production Build
```bash
npm run build
```
Compiled static assets are output to `dist/frontend/browser`.
