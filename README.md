# UNMAPPED — World Bank Youth Summit × Hack-Nation

**Informal Labour Market Skills Mapping Platform**
Hybrid LLM + Data Layer Architecture

```
worldbank-challenge/
├── backend/          FastAPI + Ollama + ESCO/ISCO/O*NET pipeline
├── frontend/         React + Vite + Tailwind v4
└── README.md
```

---

## Quick Start (3 terminals)

### Terminal 1 — Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev
```

### Terminal 3 — Ollama (optional — backend works without it)
```bash
ollama pull llama3.1:8b
ollama serve
```

Open **http://localhost:5173** — the app is ready.

---

## Architecture

```
Browser (React)
   ↓  HTTP
FastAPI Backend (port 8000)
   ↓
Stage 1: LLM Extraction     → Ollama llama3.1:8b
Stage 2: Retrieval           → TF-IDF vs ESCO/O*NET embeddings
Stage 3: Data Joins          → ESCO→ISCO→SOC→Frey-Osborne (CSV)
Stage 4: LLM Reasoning       → Ollama llama3.1:8b
   ↓
SQLite (worldbank.db) + MinIO (photos)
```

**"LLM understands and explains — data decides."**

---

## API Auth

The frontend auto-authenticates as `admin/admin` on mount.
JWT token is stored in memory and attached to all API requests.

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/token` | POST | No | Login → JWT |
| `/profiles` | POST | JWT | Create profile (runs 4-stage pipeline) |
| `/profiles` | GET | JWT | List profiles (filters: country, isco, review) |
| `/profiles/{id}` | GET | JWT | Get single profile |
| `/health` | GET | No | System health check |

---

## Environment Variables

**Backend** (`backend/.env`) — pre-configured for local dev.
**Frontend** (`frontend/.env`):
- `VITE_API_URL=http://localhost:8000` — backend URL
- `VITE_USE_MOCK=false` — set `true` to use mock data without backend

---

## Tests

```bash
cd backend
pip install pytest pytest-asyncio
python -m pytest tests/ -v
```

43 tests covering auth, profiles, hybrid pipeline, photos, and health.

---

## Data Sources

30 datasets from the UNMAPPED package covering all 13 challenge brief categories:
ESCO, ISCO-08, O*NET, Frey-Osborne, World Bank HCI/WDI, ILOSTAT, Wittgenstein, UNESCO, ITU.

---

## Team

Solo developer — World Bank Youth Summit × Hack-Nation 2026
