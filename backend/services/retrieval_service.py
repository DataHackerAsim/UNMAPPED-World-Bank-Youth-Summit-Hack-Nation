"""
Retrieval Service — Stage 2 (semantic matching via TF-IDF + cosine similarity)

Matches extracted skills against ESCO occupations and O*NET task statements.
Uses TF-IDF vectorization from scikit-learn — no GPU or torch required.

Startup:
  Builds TF-IDF matrices (cached to data/embeddings/ as .pkl for fast reload).

Runtime:
  match_occupation(skill_tags, task_summary) → dict with top-K matches
"""

import logging
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from core.config import settings

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"
EMB_DIR = DATA_DIR / "embeddings"
EMB_DIR.mkdir(exist_ok=True)

_ESCO_INDEX_PATH = EMB_DIR / "esco_tfidf_index.pkl"
_ONET_INDEX_PATH = EMB_DIR / "onet_tfidf_index.pkl"


# ── Index builders ────────────────────────────────────────────────

def _build_esco_index() -> dict:
    logger.info("Building ESCO TF-IDF index from esco_occupations.csv...")
    df = pd.read_csv(DATA_DIR / "esco_occupations.csv", encoding="utf-8")

    texts, meta = [], []
    for _, row in df.iterrows():
        label = str(row["preferredLabel"])
        desc = str(row.get("description", ""))
        combined = f"{label} — {desc}" if desc and desc != "nan" else label
        texts.append(combined)
        meta.append({
            "uri": row["conceptUri"],
            "label": label,
            "iscoGroup": int(row["iscoGroup"]) if pd.notna(row["iscoGroup"]) else None,
        })

    vectorizer = TfidfVectorizer(
        max_features=15000, stop_words="english", ngram_range=(1, 2), sublinear_tf=True
    )
    matrix = vectorizer.fit_transform(texts)
    index = {"vectorizer": vectorizer, "matrix": matrix, "meta": meta}

    with open(_ESCO_INDEX_PATH, "wb") as f:
        pickle.dump(index, f)
    logger.info("ESCO index built: %d occupations, %d features", len(meta), matrix.shape[1])
    return index


def _build_onet_index() -> dict:
    logger.info("Building O*NET TF-IDF index from onet_task_statements.csv...")
    df = pd.read_csv(DATA_DIR / "onet" / "onet_task_statements.csv", encoding="utf-8-sig")
    soc_col = [c for c in df.columns if "SOC" in c or "Code" in c][0]

    texts, meta = [], []
    for _, row in df.iterrows():
        task_text = str(row["Task"])
        texts.append(task_text)
        meta.append({
            "task_id": str(row["Task ID"]),
            "statement": task_text[:200],
            "soc_code": str(row[soc_col]).strip(),
            "title": str(row["Title"]),
        })

    vectorizer = TfidfVectorizer(
        max_features=20000, stop_words="english", ngram_range=(1, 2), sublinear_tf=True
    )
    matrix = vectorizer.fit_transform(texts)
    index = {"vectorizer": vectorizer, "matrix": matrix, "meta": meta}

    with open(_ONET_INDEX_PATH, "wb") as f:
        pickle.dump(index, f)
    logger.info("O*NET index built: %d tasks, %d features", len(meta), matrix.shape[1])
    return index


def _load_or_build(path: Path, builder) -> dict:
    if path.exists():
        logger.info("Loading cached index from %s", path.name)
        with open(path, "rb") as f:
            return pickle.load(f)
    return builder()


# ── Module-level index load ───────────────────────────────────────

logger.info("Initializing retrieval service...")
_esco_index = _load_or_build(_ESCO_INDEX_PATH, _build_esco_index)
_onet_index = _load_or_build(_ONET_INDEX_PATH, _build_onet_index)
logger.info(
    "Retrieval service ready: %d ESCO, %d O*NET tasks",
    len(_esco_index["meta"]), len(_onet_index["meta"]),
)
_indexes_loaded = True


# ── Public API ────────────────────────────────────────────────────

def is_ready() -> bool:
    return _indexes_loaded


def rebuild_indexes() -> None:
    """Force rebuild of all TF-IDF indexes. Call if CSVs are updated."""
    global _esco_index, _onet_index
    _esco_index = _build_esco_index()
    _onet_index = _build_onet_index()


def match_occupation(
    skill_tags: list[str],
    task_summary: str | None = None,
) -> dict:
    """
    Match extracted skills against ESCO occupations and O*NET tasks.

    Returns:
        {
            "esco_matches": [...],
            "onet_task_matches": [...],
            "best_match": {...} | None,
            "confidence": float,
        }
    """
    query_parts = list(skill_tags) if skill_tags else []
    if task_summary:
        query_parts.append(task_summary)
    query = " ".join(query_parts)

    if not query.strip():
        return {"esco_matches": [], "onet_task_matches": [], "best_match": None, "confidence": 0.0}

    # ESCO matching
    query_tfidf = _esco_index["vectorizer"].transform([query])
    esco_sims = cosine_similarity(query_tfidf, _esco_index["matrix"])[0]
    top_indices = np.argsort(esco_sims)[-settings.retrieval_top_k_esco:][::-1]
    esco_matches = [
        {
            "uri": _esco_index["meta"][i]["uri"],
            "label": _esco_index["meta"][i]["label"],
            "similarity": round(float(esco_sims[i]), 4),
        }
        for i in top_indices
        if esco_sims[i] > 0
    ]

    # O*NET task matching
    query_tfidf_onet = _onet_index["vectorizer"].transform([query])
    onet_sims = cosine_similarity(query_tfidf_onet, _onet_index["matrix"])[0]
    top_onet_indices = np.argsort(onet_sims)[-settings.retrieval_top_k_onet:][::-1]
    onet_matches = [
        {
            "task_id": _onet_index["meta"][i]["task_id"],
            "statement": _onet_index["meta"][i]["statement"],
            "similarity": round(float(onet_sims[i]), 4),
        }
        for i in top_onet_indices
        if onet_sims[i] > 0
    ]

    best = esco_matches[0] if esco_matches else None
    confidence = best["similarity"] if best else 0.0

    return {
        "esco_matches": esco_matches,
        "onet_task_matches": onet_matches,
        "best_match": best,
        "confidence": confidence,
    }
