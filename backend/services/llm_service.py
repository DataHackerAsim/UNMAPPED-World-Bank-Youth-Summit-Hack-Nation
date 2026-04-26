"""
LLM Service — Stage 1 (extraction) + Stage 4 (reasoning)

Stage 1: extract_skills() — parses free text into structured skill data
Stage 4: generate_reasoning() — synthesises human-readable insights from data-layer outputs

The LLM NEVER picks ISCO codes or automation scores.
"LLM understands and explains — data decides."
"""

import json
import logging

import httpx

from core.config import settings

logger = logging.getLogger(__name__)

_CHAT_URL = f"{settings.ollama_base_url}/api/chat"

# ── Fallback dicts ────────────────────────────────────────────────

EXTRACTION_FALLBACK = {
    "skill_tags": [],
    "experience_level": None,
    "task_summary": None,
    "portability_raw": None,
    "reasoning": "AI unavailable",
}

REASONING_FALLBACK = {
    "risk_level": None,
    "displacement_timeline": None,
    "resilience_skills": [],
    "explanation": "AI unavailable",
}

# ── Prompts ───────────────────────────────────────────────────────

_EXTRACTION_SYSTEM_PROMPT = """\
You are a skills extraction engine for an informal labor market platform.
You receive free-text descriptions of informal workers' skills and experience.
Extract structured skill information. Do NOT map to any occupational taxonomy or code.

Respond with ONLY this JSON object — no explanation, no markdown:
{
  "skill_tags": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "experience_level": "beginner|intermediate|advanced",
  "task_summary": "One sentence summarizing what this person does",
  "portability_raw": 0-100,
  "reasoning": "One sentence explaining the portability score"
}

Rules:
- skill_tags: exactly 5 portable, transferable skill labels (not job titles)
- portability_raw: 0 = skills only useful in one context, 100 = universally transferable
- task_summary: focus on concrete tasks, not abstract descriptions
- experience_level: based on duration, complexity, and teaching ability mentioned"""

_REASONING_SYSTEM_PROMPT = """\
You are a labor market analyst for the World Bank.
You receive structured data about an informal worker's occupation and automation risk.
Synthesize actionable insights and upskilling recommendations.

Respond with ONLY this JSON object — no explanation, no markdown:
{
  "risk_level": "low|medium|high",
  "displacement_timeline": "timeframe description",
  "resilience_skills": ["skill1", "skill2", "skill3"],
  "explanation": "2-3 sentence analysis"
}

Rules:
- risk_level: based on automation_risk score (0-0.3=low, 0.3-0.7=medium, 0.7-1.0=high)
- displacement_timeline: realistic timeframe, e.g. "5-10 years for basic tasks"
- resilience_skills: 3 specific, actionable upskilling recommendations relevant to this worker
- explanation: personalized to this worker's skills and context — reference their actual work"""


# ── Internal HTTP helper ──────────────────────────────────────────

async def _call_ollama(model: str, system_prompt: str, user_prompt: str) -> dict | None:
    """Call Ollama chat API with JSON format. Retry once on failure."""
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "format": "json",
        "options": {"num_predict": 400, "temperature": 0.2},
        "stream": False,
    }

    content = "N/A"
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(_CHAT_URL, json=payload)
                response.raise_for_status()

            data = response.json()
            content = data.get("message", {}).get("content", "")
            return json.loads(content)

        except json.JSONDecodeError:
            logger.warning(
                "Ollama returned non-JSON (attempt %d/2): %.100s", attempt + 1, content
            )
        except httpx.HTTPError as e:
            logger.warning("Ollama HTTP error (attempt %d/2): %s", attempt + 1, e)
        except Exception as e:
            logger.warning("Ollama unexpected error (attempt %d/2): %s", attempt + 1, e)

    return None


# ── Stage 1: Skill Extraction ─────────────────────────────────────

async def extract_skills(profile_text: str) -> dict:
    """
    Stage 1 — Extract structured skill data from the worker's free text.

    Returns dict with skill_tags, experience_level, task_summary,
    portability_raw, reasoning. Falls back to EXTRACTION_FALLBACK on failure.
    """
    if not profile_text or not profile_text.strip():
        return EXTRACTION_FALLBACK.copy()

    result = await _call_ollama(
        model=settings.ollama_model,
        system_prompt=_EXTRACTION_SYSTEM_PROMPT,
        user_prompt=profile_text.strip(),
    )

    if result is None:
        logger.error("Stage 1 extraction failed after 2 attempts — using fallback")
        return EXTRACTION_FALLBACK.copy()

    skill_tags = result.get("skill_tags", [])
    if not isinstance(skill_tags, list):
        skill_tags = []
    skill_tags = [str(s) for s in skill_tags[:5]]

    portability_raw = result.get("portability_raw")
    if portability_raw is not None:
        try:
            portability_raw = max(0, min(100, int(portability_raw)))
        except (ValueError, TypeError):
            portability_raw = None

    return {
        "skill_tags": skill_tags,
        "experience_level": result.get("experience_level"),
        "task_summary": result.get("task_summary"),
        "portability_raw": portability_raw,
        "reasoning": result.get("reasoning"),
    }


# ── Stage 4: Reasoning & Recommendations ─────────────────────────

async def generate_reasoning(
    isco_code: str,
    isco_title: str,
    automation_risk: float | None,
    skill_tags: list[str],
    country_code: str | None,
    skill_description: str | None = None,
    task_log: str | None = None,
) -> dict:
    """
    Stage 4 — Generate human-readable reasoning from data-layer outputs.

    The LLM synthesises — it does not decide scores or codes.
    Falls back to REASONING_FALLBACK on failure.
    """
    context_parts = [
        f"Occupation: {isco_title} (ISCO {isco_code})",
        f"Automation risk score: {automation_risk if automation_risk is not None else 'unknown'}",
        f"Worker skills: {', '.join(skill_tags) if skill_tags else 'not extracted'}",
        f"Country: {country_code or 'unknown'}",
    ]
    if skill_description:
        context_parts.append(f"Worker describes their work as: {skill_description}")
    if task_log:
        context_parts.append(f"Worker's task history: {task_log}")

    result = await _call_ollama(
        model=settings.ollama_model,
        system_prompt=_REASONING_SYSTEM_PROMPT,
        user_prompt="\n".join(context_parts),
    )

    if result is None:
        logger.error("Stage 4 reasoning failed after 2 attempts — using fallback")
        return REASONING_FALLBACK.copy()

    resilience = result.get("resilience_skills", [])
    if not isinstance(resilience, list):
        resilience = []
    resilience = [str(s) for s in resilience[:3]]

    return {
        "risk_level": result.get("risk_level"),
        "displacement_timeline": result.get("displacement_timeline"),
        "resilience_skills": resilience,
        "explanation": result.get("explanation"),
    }


# ── Health check ──────────────────────────────────────────────────

async def check_health() -> bool:
    """Return True if Ollama is reachable."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{settings.ollama_base_url}/api/tags")
            return r.status_code == 200
    except Exception:
        return False
