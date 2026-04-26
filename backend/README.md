# World Bank Skills Platform — Backend

## Project Structure

```
worldbank-challenge/
├── main.py                        # App entrypoint — registers routers, startup hooks
│
├── api/
│   └── routes/
│       ├── auth.py                # POST /token, POST /users
│       ├── health.py              # GET /health
│       ├── profiles.py            # CRUD /profiles — hosts the 4-stage hybrid pipeline
│       └── photos.py              # POST/GET /profiles/{id}/photos
│
├── services/
│   ├── llm_service.py             # Stage 1 (extraction) + Stage 4 (reasoning) via Ollama
│   ├── retrieval_service.py       # Stage 2 — TF-IDF semantic matching (ESCO + O*NET)
│   ├── data_layer_service.py      # Stage 3 — deterministic joins (ISCO, Frey-Osborne, HCI)
│   ├── ilostat_service.py         # ILOSTAT SDMX API — fallback employment context
│   └── photo_service.py           # Pillow validation + MinIO storage + llava captioning
│
├── models/
│   ├── user.py                    # SQLAlchemy User model
│   ├── worker_profile.py          # SQLAlchemy WorkerProfile model
│   └── schemas.py                 # Pydantic schemas (ProfileIn, ProfileOut, Token, ...)
│
├── core/
│   ├── config.py                  # Pydantic Settings (env vars + defaults)
│   ├── database.py                # SQLAlchemy engine, SessionLocal, Base, get_db
│   └── security.py                # JWT, bcrypt, get_current_user, require_admin, seed_admin
│
├── data/                          # Reference CSVs (read-only at runtime)
│   ├── esco_occupations.csv
│   ├── esco_skills.csv
│   ├── isco08_classification.csv
│   ├── frey_osborne_automation_scores.csv
│   ├── human_capital_index_2020.csv
│   ├── wdi_employment_indicators.csv
│   ├── crosswalks/isco_soc_crosswalk.csv
│   ├── embeddings/                # TF-IDF index cache (auto-generated)
│   └── onet/
│       ├── onet_occupation_data.csv
│       ├── onet_skills.csv
│       └── onet_task_statements.csv
│
└── tests/
    ├── conftest.py                # Fixtures: DB, mocks, client, auth helpers
    ├── test_auth.py
    ├── test_health.py
    ├── test_profiles.py
    ├── test_photos.py
    └── test_hybrid_pipeline.py    # Unit tests for data_layer + retrieval (no HTTP)
```

## Hybrid Pipeline

```
POST /profiles
  │
  ├─ Stage 1 ── llm_service.extract_skills()
  │              LLM parses free text → skill_tags, task_summary, portability_raw
  │
  ├─ Stage 2 ── retrieval_service.match_occupation()
  │              TF-IDF cosine similarity → best ESCO URI, confidence, O*NET tasks
  │
  ├─ [gate]  ── if confidence < threshold → save with needs_review=True, return early
  │
  ├─ Stage 3 ── data_layer_service.resolve_occupation()
  │              ESCO URI → ISCO code + title → SOC → Frey-Osborne automation risk
  │              ilostat_service.get_automation_risk() as fallback
  │
  └─ Stage 4 ── llm_service.generate_reasoning()
                 LLM synthesises risk narrative + resilience skill recommendations
```

"LLM understands and explains — data decides."

## Running

```bash
# Install dependencies
pip install -r requirements.txt

# Start (dev)
uvicorn main:app --reload

# Run tests
pytest tests/
```

## Environment

Copy `.env.example` to `.env` and fill in secrets. See `core/config.py` for all settings.
