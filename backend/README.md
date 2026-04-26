# UNMAPPED — Backend
 
<p>
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/python-3.11-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?logo=python&logoColor=white" alt="SQLAlchemy" />
  <img src="https://img.shields.io/badge/Ollama-llama3.1:8b-000000?logo=meta&logoColor=white" alt="Ollama" />
  <img src="https://img.shields.io/badge/scikit--learn-TF--IDF-F7931E?logo=scikitlearn&logoColor=white" alt="scikit-learn" />
  <img src="https://img.shields.io/badge/tests-72_passing-22c55e" alt="Tests" />
</p>
> **"LLM understands and explains — data decides."**
 
FastAPI backend implementing a 4-stage hybrid pipeline that maps informal workers' self-described skills to international occupation taxonomies (ESCO, ISCO-08, O\*NET), quantifies automation risk via deterministic joins against Frey-Osborne scores, and generates actionable upskilling recommendations.
 
---
 
## Table of Contents
 
- [Quick Start](#quick-start)
- [Hybrid Pipeline](#hybrid-pipeline)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Services Architecture](#services-architecture)
- [Data Layer](#data-layer)
- [Database Schema](#database-schema)
- [Authentication & Authorization](#authentication--authorization)
- [Configuration](#configuration)
- [Testing](#testing)
- [Docker](#docker)
- [Graceful Degradation](#graceful-degradation)
---
 
## Quick Start
 
### Local Development
 
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
 
# Install dependencies
pip install -r requirements.txt
 
# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
 
The server starts with SQLite by default — no external database needed. On startup, the lifespan hook:
 
1. Creates all database tables via `Base.metadata.create_all()`
2. Seeds the admin user (`admin` / `admin`)
3. Initializes the MinIO photo bucket (non-blocking failure)
4. Builds or loads cached TF-IDF indexes for ESCO and O\*NET
5. Probes Ollama health (non-blocking)
### With Docker Compose
 
```bash
docker compose up --build
```
 
Spins up the API, PostgreSQL, MinIO, Ollama, and model-pull init container.
 
### Interactive API Docs
 
Once running, visit [http://localhost:8000/docs](http://localhost:8000/docs) for the auto-generated Swagger UI.
 
---
 
## Hybrid Pipeline
 
The core of the platform is a 4-stage pipeline triggered by `POST /profiles`:
 
```
POST /profiles  (ProfileIn payload)
  │
  ├─ Stage 1 ── llm_service.extract_skills()
  │              Ollama llama3.1:8b parses free text into:
  │              • skill_tags (5 portable labels)
  │              • task_summary (1 sentence)
  │              • experience_level (beginner/intermediate/advanced)
  │              • portability_raw (0–100)
  │
  ├─ Stage 2 ── retrieval_service.match_occupation()
  │              TF-IDF cosine similarity against:
  │              • ESCO occupations (top-5, with URI + label + score)
  │              • O*NET task statements (top-3, with task ID + statement)
  │
  ├─ [GATE]  ── if confidence < 0.15 → save with needs_review=True, return early
  │              No bad classification is surfaced to the user.
  │
  ├─ Stage 3 ── data_layer_service.resolve_occupation()
  │              Deterministic join chain (all O(1) dict lookups):
  │              ESCO URI → iscoGroup → ISCO-08 code + title
  │              ISCO-08 → SOC code(s) via crosswalk (one-to-many)
  │              SOC → Frey-Osborne automation probability (averaged)
  │              Country → HCI weight → portability adjustment
  │
  │              Fallback: ilostat_service.get_automation_risk()
  │              Uses OECD major-group estimates (Nedelkoska & Quintini 2018)
  │              when Frey-Osborne has no SOC match.
  │
  └─ Stage 4 ── llm_service.generate_reasoning()
                 Ollama synthesizes from Stage 3 outputs:
                 • risk_level (low/medium/high)
                 • displacement_timeline
                 • resilience_skills (3 actionable recommendations)
                 • explanation (personalized 2–3 sentence analysis)
```
 
**Key invariant:** The LLM never picks ISCO codes, never assigns automation scores, never fabricates statistics. It extracts and explains — data decides.
 
---
 
## Project Structure
 
```
backend/
├── main.py                        # App entrypoint — lifespan, CORS, rate limiter, routers
│
├── api/routes/                    # HTTP layer (thin controllers)
│   ├── auth.py                    #   POST /token · POST /users · GET /me
│   ├── health.py                  #   GET /health — DB, Ollama, MinIO, retrieval status
│   ├── profiles.py                #   CRUD + 4-stage pipeline orchestration
│   ├── risk.py                    #   POST /risk/assess — automation risk module
│   ├── opportunities.py           #   POST /opportunities/match — job matching
│   ├── policy.py                  #   GET /policy/{country} — aggregate analytics
│   ├── photos.py                  #   POST/GET /profiles/{id}/photos
│   ├── ilostat.py                 #   GET /ilostat/employment — SDMX proxy
│   └── validate.py                #   GET /validate/isco — code validation
│
├── services/                      # Business logic (no HTTP awareness)
│   ├── llm_service.py             #   Stages 1 + 4: Ollama chat API wrapper
│   ├── retrieval_service.py       #   Stage 2: TF-IDF index build + cosine matching
│   ├── data_layer_service.py      #   Stage 3: CSV loads, O(1) lookups, join chain
│   ├── ilostat_service.py         #   ILOSTAT SDMX client + OECD fallback scores
│   └── photo_service.py           #   Pillow validation, MinIO storage, llava captioning
│
├── models/
│   ├── user.py                    #   SQLAlchemy User model
│   ├── worker_profile.py          #   SQLAlchemy WorkerProfile (30+ columns, 4-stage outputs)
│   └── schemas.py                 #   Pydantic I/O schemas (ProfileIn, ProfileOut, etc.)
│                                  #   ProfileIn strips AI-computed fields with model_validator
│
├── core/
│   ├── config.py                  #   Pydantic Settings — 30+ env vars with defaults
│   ├── database.py                #   SQLAlchemy engine, SessionLocal, Base, get_db()
│   └── security.py                #   JWT create/decode, bcrypt, get_current_user, require_admin
│
├── data/                          # Reference CSVs — read-only at runtime
│   ├── esco_occupations.csv       #   3,000+ ESCO occupations (URI, label, iscoGroup)
│   ├── isco08_classification.csv  #   ISCO-08 4-digit codes with major-group labels
│   ├── frey_osborne_automation_scores.csv  # 702 SOC codes with automation probability
│   ├── human_capital_index_2020.csv        # Country-level HCI scores
│   ├── wdi_employment_indicators.csv       # World Bank employment data
│   ├── crosswalks/
│   │   └── isco_soc_crosswalk.csv #   ISCO-08 → SOC-2010 mapping (one-to-many)
│   ├── onet/
│   │   ├── onet_occupation_data.csv
│   │   ├── onet_skills.csv
│   │   └── onet_task_statements.csv  # 19,000+ task statements
│   └── embeddings/                #   Auto-generated TF-IDF pickle cache
│       ├── esco_tfidf_index.pkl
│       └── onet_tfidf_index.pkl
│
├── tests/                         # 72 tests
│   ├── conftest.py                #   Fixtures: in-memory DB, mocked Ollama, test client
│   ├── test_auth.py               #   7 tests — login, JWT, user creation, admin gates
│   ├── test_profiles.py           #   11 tests — CRUD, ownership, review, completeness
│   ├── test_hybrid_pipeline.py    #   21 tests — data_layer + retrieval unit tests
│   ├── test_photos.py             #   3 tests — upload validation, MinIO mock
│   ├── test_health.py             #   1 test — health endpoint
│   ├── test_smoke.py              #   23 tests — end-to-end HTTP contract tests
│   └── test_modules.py            #   6 tests — risk, opportunities, policy modules
│
├── Dockerfile                     # NVIDIA CUDA 12.1 + Python 3.11 (GPU-optional)
├── docker-compose.yml             # Backend-focused compose (API + DB + MinIO + Ollama)
├── requirements.txt
├── .env.example
└── .gitignore
```
 
---
 
## API Reference
 
### Authentication
 
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/token` | POST | — | OAuth2 password form → JWT (`access_token` + `token_type`) |
| `/users` | POST | Admin | Create user (`username`, `password`, `is_admin`) |
| `/me` | GET | JWT | Current user identity |
 
### Profiles (4-Stage Pipeline)
 
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/profiles` | POST | JWT | Create profile — runs full hybrid pipeline |
| `/profiles` | GET | JWT | List profiles. Non-admins see own only. Supports filters: `country_code`, `isco_code`, `needs_review`, `date_from`, `date_to`, `skip`, `limit` |
| `/profiles/{id}` | GET | JWT | Get profile (owner or admin) |
| `/profiles/{id}` | DELETE | Admin | Delete profile + MinIO photos |
| `/profiles/{id}/review` | PATCH | Admin | Set review status + notes |
 
### Modules
 
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/risk/assess` | POST | JWT | Automation risk with LMIC calibration, skill breakdown, Wittgenstein trend |
| `/opportunities/match` | POST | JWT | Top-4 ESCO matches with pathway, wage floor, sector growth |
| `/policy/{country}` | GET | JWT | Aggregate stats: profiles, risk, education distribution, sector gaps |
 
### Data & Utility
 
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/profiles/{id}/photos` | POST | JWT | Upload photo (multipart form, max 3/profile) |
| `/profiles/{id}/photos/{filename}` | GET | JWT | Get presigned MinIO URL |
| `/ilostat/employment` | GET | JWT | ILOSTAT SDMX lookup (`isco_code` + `country_code`) |
| `/validate/isco` | GET | JWT | Validate ISCO-08 4-digit code |
| `/health` | GET | — | System health (DB, Ollama, MinIO, retrieval indexes) |
 
---
 
## Services Architecture
 
### `llm_service.py` — Stages 1 + 4
 
Wraps Ollama's `/api/chat` endpoint. Uses structured JSON mode with `temperature: 0.2` and `num_predict: 400`. Each call has a system prompt constraining output to a specific JSON schema. Retries once on failure. Falls back to documented `EXTRACTION_FALLBACK` / `REASONING_FALLBACK` dicts — the rest of the pipeline always has valid input.
 
### `retrieval_service.py` — Stage 2
 
Builds TF-IDF matrices on startup from ESCO occupations and O\*NET task statements using `TfidfVectorizer` with `max_features=15000–20000`, English stop words, `(1,2)` ngrams, and `sublinear_tf=True`. Matrices are pickled to `data/embeddings/` for fast reload. At runtime, the query (concatenated skill tags + task summary) is vectorized and matched via `cosine_similarity`. Returns top-K matches with confidence scores.
 
### `data_layer_service.py` — Stage 3
 
Loads all reference CSVs into Python dicts at import time. Every lookup is O(1). The join chain:
 
```
ESCO URI → iscoGroup (dict)
iscoGroup → ISCO-08 code + title + major group (dict)
ISCO-08 → SOC code(s) (dict, one-to-many)
SOC → Frey-Osborne probability (dict, averaged if multiple)
Country → HCI score → portability weight (dict)
```
 
Also provides `compute_portability()` which combines the LLM's raw portability estimate with the HCI country weight and a duration factor.
 
### `ilostat_service.py` — Fallback + Employment Context
 
When Frey-Osborne has no match for a SOC code, the ILOSTAT service provides ISCO major-group automation estimates from Nedelkoska & Quintini (2018), OECD Working Paper No. 202. These are real peer-reviewed estimates, not placeholders. Also provides live SDMX employment queries.
 
### `photo_service.py` — Evidence Upload
 
Validates images via Pillow (rejects non-image files), stores in MinIO under `{profile_id}/{uuid}_{filename}`, and optionally captions photos using `llava:7b` to describe tools, products, and work environments visible in the image.
 
---
 
## Data Layer
 
All reference datasets are loaded once at module import. Memory footprint is modest (~50 MB for all CSVs + TF-IDF matrices).
 
| Dataset | Records | Lookup Key | Loaded Into |
|---------|---------|-----------|-------------|
| `esco_occupations.csv` | ~3,000 | `conceptUri` | `ESCO_TO_ISCO_GROUP`, `ESCO_LABELS` |
| `isco08_classification.csv` | ~440 | Unit code (int) | `ISCO_LOOKUP`, `VALID_ISCO_CODES` |
| `isco_soc_crosswalk.csv` | ~1,200 | ISCO-08 code | `ISCO_TO_SOC` (one-to-many) |
| `frey_osborne_automation_scores.csv` | 702 | SOC code | `FREY_OSBORNE` |
| `human_capital_index_2020.csv` | ~170 | WB alpha-3 code | `HCI_INDEX` |
| `onet_task_statements.csv` | ~19,000 | TF-IDF matrix | `_onet_index` |
 
---
 
## Database Schema
 
### `WorkerProfile` (30+ columns)
 
The profile model spans all 4 pipeline stages plus metadata:
 
| Group | Columns |
|-------|---------|
| Identity | `id`, `owner_user_id` (FK → users), `name`, `age`, `location_city`, `country_code`, `consent_given`, `data_collection_date` |
| Review | `needs_review`, `review_notes` |
| Skills Input | `skill_description`, `duration_years`, `frequency`, `tools_used` (JSON), `task_log`, `income_range`, `certifications` (JSON), `languages` (JSON), `profile_completeness_score` |
| Photos | `photo_paths` (JSON), `photo_descriptions` (JSON) |
| Stage 1 | `skill_tags` (JSON) |
| Stage 2 | `esco_occupation_uri`, `matched_onet_tasks` (JSON), `retrieval_confidence` |
| Stage 3 | `isco_code`, `isco_title`, `automation_risk_score`, `portability_score` |
| Stage 4 | `resilience_skills` (JSON), `displacement_timeline` |
 
### `User`
 
| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer PK | Auto-increment |
| `username` | String (unique) | Login identifier |
| `hashed_password` | String | bcrypt hash |
| `is_admin` | Boolean | Role flag |
 
---
 
## Authentication & Authorization
 
The auth system uses **OAuth2 password flow** with JWT bearer tokens.
 
**Token creation:** `POST /token` accepts `username` + `password` as `application/x-www-form-urlencoded`, verifies the bcrypt hash, returns a JWT signed with `HS256` and a configurable expiry (default: 30 minutes).
 
**Token verification:** The `get_current_user` dependency decodes the JWT, extracts the `sub` claim, and loads the `User` from the database. Returns `401` on invalid/expired tokens.
 
**Admin enforcement:** `require_admin` depends on `get_current_user` and additionally checks `is_admin`. Returns `403` for non-admin users.
 
**Ownership enforcement:** Profile routes use `_profile_or_403()` — non-admin users can only access profiles where `owner_user_id` matches their `user.id`. Admins see everything.
 
**Input sanitization:** `ProfileIn` uses a Pydantic `model_validator` that strips 14 AI-computed fields (`isco_code`, `automation_risk_score`, `skill_tags`, etc.) before validation, preventing clients from injecting pipeline outputs.
 
---
 
## Configuration
 
All settings are managed via `pydantic-settings` and can be overridden with environment variables or a `.env` file. See `.env.example` for the full reference.
 
| Category | Key Variables |
|----------|--------------|
| Auth | `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` |
| Database | `DATABASE_URL` (SQLite or PostgreSQL URI) |
| Ollama | `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_VISION_MODEL` |
| MinIO | `MINIO_ENDPOINT`, `MINIO_PUBLIC_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` |
| Retrieval | `RETRIEVAL_CONFIDENCE_THRESHOLD`, `RETRIEVAL_TOP_K_ESCO`, `RETRIEVAL_TOP_K_ONET` |
| App | `MIN_COMPLETENESS_SCORE`, `MAX_PHOTOS_PER_PROFILE`, `PRESIGNED_URL_EXPIRY_HOURS` |
 
---
 
## Testing
 
```bash
# Run all tests
python -m pytest tests/ -v
 
# Run specific module
python -m pytest tests/test_hybrid_pipeline.py -v
 
# Run with coverage
python -m pytest tests/ --cov=. --cov-report=term-missing
```
 
### Test Architecture
 
Tests use an **in-memory SQLite database** and mock all external services (Ollama, MinIO). The `conftest.py` provides:
 
- `db` fixture — fresh in-memory database per test
- `client` fixture — `TestClient` with dependency overrides
- `admin_token` / `user_token` helpers — pre-authenticated JWT headers
- Mocked `llm_service` responses — deterministic extraction and reasoning
- Mocked `photo_service` — bypasses MinIO entirely
### Test Coverage
 
| Module | Tests | Covers |
|--------|-------|--------|
| `test_auth.py` | 7 | Login, JWT validation, user creation, admin-only gates, duplicate rejection |
| `test_profiles.py` | 11 | Create, list, get, delete, ownership filtering, review, completeness threshold |
| `test_hybrid_pipeline.py` | 21 | `resolve_occupation()`, `compute_portability()`, `validate_isco_code()`, `match_occupation()`, ISCO lookup edge cases, crosswalk joins, HCI weighting |
| `test_photos.py` | 3 | Upload validation (real vs fake images), Pillow rejection |
| `test_smoke.py` | 23 | End-to-end HTTP contract: full pipeline flow, field presence, type checks |
| `test_modules.py` | 6 | Risk assessment, opportunity matching, policy dashboard modules |
| `test_health.py` | 1 | Health endpoint response structure |
 
---
 
## Docker
 
The `Dockerfile` uses `nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04` as the base image, providing GPU access for the optional neural-embedding upgrade path. The TF-IDF default runs on CPU with zero GPU overhead.
 
Key Dockerfile features:
- Non-root user (`appuser:appgroup`, UID 1001)
- Separate dependency layer for Docker cache efficiency
- Writable TF-IDF cache directory with correct ownership
- Built-in health check (`curl /health` every 30s)
- Single uvicorn worker (appropriate for SQLite; scale workers for PostgreSQL)
The `docker-compose.yml` includes GPU resource reservations for both the API and Ollama containers. TF-IDF indexes are persisted in a named volume (`embeddings_cache`) to avoid rebuilds across container restarts.
 
---
 
## Graceful Degradation
 
The backend is designed to run in constrained environments:
 
| Component | If Unavailable | Behaviour |
|-----------|----------------|-----------|
| Ollama | Stages 1 + 4 return documented fallback dicts | Retrieval + data layer still produce valid classifications |
| MinIO | Photo uploads fail with a warning | Profile creation and all analytics work normally |
| ILOSTAT | Employment lookup returns null | Frey-Osborne (local CSV) is the primary source; ILOSTAT is only a fallback |
| PostgreSQL | N/A for dev | SQLite is the default; PostgreSQL is for Docker/production |
| GPU | TF-IDF runs on CPU | Neural-embedding upgrade requires GPU (commented in requirements.txt) |
 
This means a demo environment with just Python + SQLite produces valid occupation mappings, risk scores, and opportunity matches — Ollama and MinIO are genuine enhancements, not hard dependencies.
