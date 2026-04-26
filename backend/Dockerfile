# ── Base: CUDA 12.1 + Python 3.11 (slim) ────────────────────────
# Gives access to GPU for sentence-transformers / torch if enabled.
# The default TF-IDF path runs fine on CPU; CUDA is available for
# the neural-embedding upgrade path (sentence-transformers + torch).
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ── System deps ──────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.11 \
        python3.11-dev \
        python3-pip \
        python3.11-venv \
        build-essential \
        libpq-dev \
        curl \
    && ln -sf /usr/bin/python3.11 /usr/bin/python \
    && ln -sf /usr/bin/pip3 /usr/bin/pip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Non-root user ────────────────────────────────────────────────
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app

# ── Python deps (separate layer for cache efficiency) ────────────
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# ── App source ───────────────────────────────────────────────────
COPY --chown=appuser:appgroup . .

# Ensure the TF-IDF cache dir exists and is writable
RUN mkdir -p /app/data/embeddings && chown -R appuser:appgroup /app/data

USER appuser

# ── Runtime config ───────────────────────────────────────────────
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
