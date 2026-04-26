<p align="center">
  <img src="https://img.shields.io/badge/World_Bank-Youth_Summit_×_Hack--Nation_2026-0072C6?style=for-the-badge" alt="World Bank Youth Summit × Hack-Nation 2026" />
</p>
<h1 align="center">UNMAPPED</h1>
 
<p align="center">
  <strong>Informal Labour Market Skills Mapping Platform</strong><br/>
  <em>A hybrid LLM + deterministic data-layer architecture that maps informal workers'
  self-described skills to international occupation taxonomies, quantifies automation
  risk, and surfaces realistic employment opportunities — grounded in econometric
  data, not hallucinated rankings.</em>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/python-3.11-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Ollama-llama3.1:8b-000000?logo=meta&logoColor=white" alt="Ollama" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/tests-72_passing-22c55e" alt="Tests" />
</p>
---
 
## The Problem
 
Over **2 billion workers** operate in the informal economy worldwide (ILO, 2024). Their skills are invisible to labour market systems — they have no CVs, no LinkedIn profiles, no formal credentials. Existing skills-mapping tools assume formal-sector inputs and fail for a street vendor in Accra, a seamstress in Dhaka, or a mechanic in Nairobi.
 
UNMAPPED bridges this gap by accepting **free-text descriptions** of what people actually do, then mapping those descriptions to internationally recognized taxonomies (ESCO, ISCO-08, O\*NET) and quantifying automation risk using peer-reviewed econometric data (Frey & Osborne 2013, Nedelkoska & Quintini 2018).
 
## Core Design Principle
 
> **"LLM understands and explains — data decides."**
 
The LLM (Llama 3.1 8B via Ollama) handles two things: extracting structure from unstructured text and synthesizing human-readable narratives. Every classification, score, and recommendation is produced by **deterministic data joins** against authoritative reference datasets. This architecture eliminates hallucinated occupation codes, fabricated risk scores, and invented statistics.
 
## Architecture
 
```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (React 18 · Vite · Tailwind v4)                        │
│  5-step onboarding → Risk View → Opportunities → Policy Dash    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP + JWT
┌────────────────────────────▼─────────────────────────────────────┐
│  FastAPI Backend (port 8000)                                     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  POST /profiles — 4-Stage Hybrid Pipeline                   │ │
│  │                                                             │ │
│  │  Stage 1 │ LLM Extraction     │ Ollama llama3.1:8b          │ │
│  │          │ Free text → skill_tags, task_summary, portability │ │
│  │          ▼                                                  │ │
│  │  Stage 2 │ Retrieval Matching  │ TF-IDF cosine similarity   │ │
│  │          │ Skills → top-K ESCO occupations + O*NET tasks    │ │
│  │          ▼                                                  │ │
│  │  [GATE]  │ Confidence < 0.15? → flag for human review       │ │
│  │          ▼                                                  │ │
│  │  Stage 3 │ Data Layer Joins    │ Deterministic lookups      │ │
│  │          │ ESCO → ISCO → SOC → Frey-Osborne risk            │ │
│  │          │ Country → HCI weight → portability adjustment    │ │
│  │          ▼                                                  │ │
│  │  Stage 4 │ LLM Reasoning       │ Ollama llama3.1:8b         │ │
│  │          │ Data outputs → risk narrative + recommendations  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  SQLite / PostgreSQL │ MinIO (photos) │ ILOSTAT SDMX (fallback)  │
└──────────────────────────────────────────────────────────────────┘
```
 
## Data Sources
 
UNMAPPED integrates **10+ authoritative datasets** spanning all 13 categories of the World Bank challenge brief:
 
| Dataset | Source | Role |
|---------|--------|------|
| ESCO Occupations | European Commission | Primary occupation taxonomy (3,000+ occupations) |
| ISCO-08 Classification | ILO | 4-digit international standard occupation codes |
| O\*NET Task Statements | US DOL | Granular task-level matching (19,000+ statements) |
| ISCO → SOC Crosswalk | BLS | Bridges international and US occupation systems |
| Frey-Osborne Scores | Oxford Martin School | Automation probability per SOC code (702 occupations) |
| Human Capital Index 2020 | World Bank | Country-level HCI for portability weighting |
| WDI Employment Indicators | World Bank | Macro employment context |
| ILOSTAT SDMX | ILO | Live employment data by occupation and country |
| Wittgenstein Projections | Wittgenstein Centre | Education completion trend forecasts (SSP2) |
| Nedelkoska & Quintini | OECD (Working Paper 202) | ISCO major-group automation estimates (fallback) |
 
## Platform Modules
 
### Module 1 — Skills Passport (5-Step Onboarding)
 
Country-calibrated data collection with locale-aware education levels, sector lists, and currency. Produces a structured worker profile mapped to ESCO/ISCO taxonomies with a portability score weighted by country HCI.
 
### Module 2 — AI Readiness Lens (Risk View)
 
Automation risk assessment using Frey-Osborne scores, LMIC-calibrated via HCI weighting. Three-zone skill breakdown (at-risk, durable, adjacent). Wittgenstein education trend projections. Live ILOSTAT employment lookup via SDMX API.
 
### Module 3 — Opportunity Matching
 
Matches worker skill profiles against ESCO occupations using TF-IDF retrieval. Classifies pathways as immediate, with-training, or career-change. Displays ILO-sourced sector growth rates and ISCO-major-group wage floors.
 
### Module 4 — Policy Dashboard (Admin)
 
Aggregate analytics by country: profile counts, top at-risk occupations, education distribution, sector supply/demand gaps with bar-chart visualizations. Driven by real database queries, not static mockups.
 
### Module 5 — Admin Panel
 
User management, profile review queue, ISCO code validation. Role-based access control with JWT authentication and bcrypt password hashing.
 
---
 
## Quick Start
 
### Option A — Docker Compose (Recommended)
 
```bash
git clone https://github.com/cantcode27/worldbank-challenge.git
cd worldbank-challenge
docker compose up --build
```
 
This spins up **5 containers**: API, frontend, PostgreSQL, MinIO, and Ollama. An init container automatically pulls `llama3.1:8b` and `llava:7b` models on first run.
 
| Service | URL |
|---------|-----|
| Frontend | [http://localhost:5173](http://localhost:5173) |
| Backend API | [http://localhost:8000](http://localhost:8000) |
| API Docs (Swagger) | [http://localhost:8000/docs](http://localhost:8000/docs) |
| MinIO Console | [http://localhost:9001](http://localhost:9001) |
 
### Option B — Local Development (3 Terminals)
 
**Terminal 1 — Backend**
 
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
 
**Terminal 2 — Frontend**
 
```bash
cd frontend
npm install
npm run dev
```
 
**Terminal 3 — Ollama (optional)**
 
```bash
ollama pull llama3.1:8b
ollama serve
```
 
> **Graceful degradation:** The backend runs fully without Ollama — LLM stages return documented fallback values and all data-layer functionality (retrieval, classification, risk scoring) remains operational.
 
### Default Credentials
 
| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin` | Admin (full access) |
 
---
 
## API Reference
 
All endpoints except `/token` and `/health` require a JWT bearer token.
 
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/token` | POST | — | OAuth2 password flow → JWT |
| `/health` | GET | — | System health (DB, Ollama, MinIO, retrieval indexes) |
| `/profiles` | POST | JWT | Create profile — executes 4-stage hybrid pipeline |
| `/profiles` | GET | JWT | List profiles (owner-scoped; admins see all) |
| `/profiles/{id}` | GET | JWT | Single profile (owner or admin) |
| `/profiles/{id}` | DELETE | Admin | Delete profile + associated MinIO photos |
| `/profiles/{id}/review` | PATCH | Admin | Toggle review flag, add review notes |
| `/profiles/{id}/photos` | POST | JWT | Upload photo (Pillow-validated, MinIO-stored, llava-captioned) |
| `/risk/assess` | POST | JWT | Automation risk assessment with LMIC calibration |
| `/opportunities/match` | POST | JWT | ESCO-based opportunity matching with sector growth data |
| `/policy/{country}` | GET | JWT | Aggregate country-level policy analytics |
| `/ilostat/employment` | GET | JWT | Live ILOSTAT SDMX employment lookup |
| `/validate/isco` | GET | JWT | ISCO-08 code validation against official classification |
| `/users` | POST | Admin | Create new user account |
 
## Testing
 
```bash
cd backend
python -m pytest tests/ -v
```
 
**72 tests** across 7 test modules covering authentication flows, profile CRUD with ownership enforcement, the hybrid pipeline (unit-level data-layer and retrieval tests), photo upload and validation, health checks, and end-to-end smoke tests.
 
```bash
cd frontend
npm test
```
 
Frontend tests cover `FlowContext` state management, `AuthContext` login/logout flows, step-gate navigation guards, and component rendering.
 
---
 
## Project Structure
 
```
worldbank-challenge/
├── docker-compose.yml              # Full-stack orchestration (5 services + init)
│
├── backend/                        # Python · FastAPI · Hybrid pipeline
│   ├── main.py                     # App entrypoint, lifespan hooks, CORS, rate limiting
│   ├── api/routes/                 # 9 route modules
│   │   ├── auth.py                 #   POST /token, POST /users, GET /me
│   │   ├── profiles.py             #   CRUD + 4-stage pipeline orchestration
│   │   ├── risk.py                 #   Automation risk assessment module
│   │   ├── opportunities.py        #   ESCO-based opportunity matching
│   │   ├── policy.py               #   Aggregate policy analytics
│   │   ├── photos.py               #   Photo upload, captioning, presigned URLs
│   │   ├── ilostat.py              #   ILOSTAT SDMX proxy
│   │   ├── validate.py             #   ISCO code validation
│   │   └── health.py               #   System health check
│   ├── services/                   # Business logic layer
│   │   ├── llm_service.py          #   Stage 1 (extraction) + Stage 4 (reasoning)
│   │   ├── retrieval_service.py    #   Stage 2 — TF-IDF semantic matching
│   │   ├── data_layer_service.py   #   Stage 3 — deterministic data joins
│   │   ├── ilostat_service.py      #   ILOSTAT SDMX API + OECD fallback
│   │   └── photo_service.py        #   Pillow validation + MinIO + llava captioning
│   ├── models/                     # Data models
│   │   ├── worker_profile.py       #   SQLAlchemy WorkerProfile (30+ columns)
│   │   ├── user.py                 #   SQLAlchemy User
│   │   └── schemas.py              #   Pydantic I/O schemas with AI-field stripping
│   ├── core/                       # Infrastructure
│   │   ├── config.py               #   Pydantic Settings (30+ env vars)
│   │   ├── database.py             #   SQLAlchemy engine, session, Base
│   │   └── security.py             #   JWT, bcrypt, RBAC dependencies
│   ├── data/                       # Reference datasets (read-only at runtime)
│   │   ├── esco_occupations.csv
│   │   ├── isco08_classification.csv
│   │   ├── frey_osborne_automation_scores.csv
│   │   ├── human_capital_index_2020.csv
│   │   ├── wdi_employment_indicators.csv
│   │   ├── crosswalks/isco_soc_crosswalk.csv
│   │   ├── onet/                   #   O*NET occupation, skills, task data
│   │   └── embeddings/             #   TF-IDF index cache (.pkl, auto-generated)
│   ├── tests/                      # 72 tests
│   ├── Dockerfile                  # CUDA 12.1 + Python 3.11 (GPU-ready)
│   └── requirements.txt
│
├── frontend/                       # React · Vite · Tailwind v4
│   ├── src/
│   │   ├── App.jsx                 # Router, sidebar, layout, route guards
│   │   ├── pages/                  # 11 page components
│   │   ├── components/ui/          # Shell, MetricCard, OpportunityCard, SkillTag, etc.
│   │   ├── context/                # AuthContext, FlowContext, CountryContext
│   │   ├── api/                    # Axios client + complete mock layer
│   │   │   ├── client.js           #   17 API functions with form↔schema mapping
│   │   │   └── mock.js             #   Full offline mock for every endpoint
│   │   ├── data/countries.js       # Country configs (Ghana, Bangladesh, ...)
│   │   ├── locales/                # i18n (en, fr)
│   │   └── index.css               # Design system (Fraunces + DM Sans, dark theme)
│   ├── Dockerfile
│   └── package.json
│
└── README.md
```
 
## Environment Variables
 
See [`backend/.env.example`](backend/.env.example) for the full reference. Key variables:
 
| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `dev-secret-...` | JWT signing key (**change in production**) |
| `DATABASE_URL` | `sqlite:///./worldbank.db` | SQLite (dev) or PostgreSQL URI (Docker) |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama inference server |
| `OLLAMA_MODEL` | `llama3.1:8b` | LLM for extraction and reasoning |
| `OLLAMA_VISION_MODEL` | `llava:7b` | Vision model for photo captioning |
| `RETRIEVAL_CONFIDENCE_THRESHOLD` | `0.15` | Below this → flag for human review |
| `MINIO_ENDPOINT` | `localhost:9000` | MinIO S3-compatible storage |
| `VITE_API_URL` | `http://localhost:8000` | Frontend → backend URL |
| `VITE_USE_MOCK` | `false` | Enable offline demo mode (no backend needed) |
 
## Key Design Decisions
 
**Why TF-IDF over neural embeddings?** The default retrieval uses scikit-learn TF-IDF with bigrams and sublinear TF — no GPU, no torch, no 2 GB model download. This runs on a $5/month VPS. The architecture supports a drop-in upgrade to `sentence-transformers` (the dependency is in `requirements.txt`, commented out) for production deployments with GPU access.
 
**Why Ollama?** Fully local inference with no API keys, no data exfiltration, no cost-per-token. Critical for a platform handling vulnerable populations' personal data in LMIC contexts. The `llava:7b` vision model also enables photo captioning of work evidence without sending images to cloud APIs.
 
**Why the confidence gate?** Low-confidence retrieval matches (cosine similarity < 0.15) are automatically flagged for admin review rather than surfacing a bad classification. No classification is better than a wrong classification for someone whose livelihood decisions might depend on it.
 
**Why LMIC calibration?** Frey-Osborne automation scores were estimated for OECD economies. Applying them raw to a garment worker in Dhaka overstates near-term displacement risk. UNMAPPED multiplies the global score by the country's HCI weight (World Bank Human Capital Index 2020), reflecting that automation adoption is slower in lower-infrastructure contexts.
 
## Internationalization
 
The frontend supports i18n via `react-i18next` with English and French translation files. Country configurations provide locale-aware education levels, sectors, currencies, and regional labels — currently configured for Ghana and Bangladesh, extensible to additional contexts.
 
## Offline / Demo Mode
 
Set `VITE_USE_MOCK=true` in `frontend/.env` to run the entire frontend with a complete mock data layer — no backend, no Ollama, no database required. Every API function has a corresponding mock implementation producing realistic sample data.
 
## Tech Stack
 
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS v4, Recharts, react-router-dom v6, i18next, Axios |
| Backend | FastAPI, SQLAlchemy, Pydantic v2, scikit-learn, pandas, NumPy, Pillow, httpx |
| LLM Inference | Ollama (llama3.1:8b + llava:7b) |
| Database | SQLite (dev) / PostgreSQL 16 (production) |
| Object Storage | MinIO (S3-compatible) |
| External APIs | ILOSTAT SDMX, World Bank WDI |
| Auth | JWT (python-jose), bcrypt (passlib), OAuth2 password flow |
| Containerization | Docker Compose, NVIDIA CUDA 12.1 base image (optional GPU) |
| Testing | pytest, pytest-asyncio, Vitest, React Testing Library |
 
## Author
 
**Asim Ahmed** — Team Lead
**Aarish Sajid** — Backend Developer 
**Shawaiz Zafar** — Frontend Developer 
World Bank Youth Summit × Hack-Nation 2026
 
---
 
<p align="center">
  <em>"Close the distance between skills and opportunity."</em>
</p>
