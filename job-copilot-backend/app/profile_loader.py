import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

PROFILE_FILE = Path(__file__).parent.parent / "data" / "profile.json"

_profile_cache: Optional[dict] = None
_profile_loaded: bool = False


def load_profile() -> Optional[dict]:
    """Load data/profile.json once and cache it in memory. Returns None if missing."""
    global _profile_cache, _profile_loaded

    if _profile_loaded:
        return _profile_cache

    if not PROFILE_FILE.exists():
        logger.warning(f"[profile_loader] profile.json not found at {PROFILE_FILE}")
        _profile_loaded = True
        _profile_cache = None
        return None

    try:
        with open(PROFILE_FILE, "r", encoding="utf-8") as f:
            _profile_cache = json.load(f)
        _profile_loaded = True
        logger.info(f"[profile_loader] Loaded profile for {_profile_cache.get('name', 'unknown')}")
        return _profile_cache
    except (json.JSONDecodeError, OSError) as e:
        logger.warning(f"[profile_loader] Failed to load profile: {e}")
        _profile_loaded = True
        _profile_cache = None
        return None


def format_profile_for_prompt(profile: dict) -> str:
    """Format the full profile dict into a readable string for LLM context."""
    if not profile:
        return ""

    parts: list[str] = []

    name = profile.get("name", "")
    if name:
        parts.append(f"NAME: {name}")

    seeking = profile.get("seeking", "")
    if seeking:
        parts.append(f"SEEKING: {seeking}")

    skills = profile.get("skills", {}) or {}
    if skills:
        parts.append("\nSKILLS:")
        for category in ("languages", "frameworks", "ai_and_ml", "databases", "tools", "cs_fundamentals"):
            items = skills.get(category, [])
            if items:
                label = category.replace("_", " ").title()
                parts.append(f"  {label}: {', '.join(items)}")

    education = profile.get("education", []) or []
    if education:
        parts.append("\nEDUCATION:")
        for edu in education:
            degree = edu.get("degree", "")
            university = edu.get("university", "")
            location = edu.get("location", "")
            parts.append(f"  - {degree}, {university} ({location})")
            coursework = edu.get("coursework", [])
            if coursework:
                parts.append(f"    Coursework: {', '.join(coursework)}")

    experience = profile.get("experience", []) or []
    if experience:
        parts.append("\nEXPERIENCE:")
        for exp in experience:
            title = exp.get("title", "")
            company = exp.get("company", "")
            duration = exp.get("duration", "")
            parts.append(f"\n  {title} at {company} ({duration})")
            for h in exp.get("highlights", []):
                parts.append(f"    - {h}")
            skills_used = exp.get("skills_used", [])
            if skills_used:
                parts.append(f"    Skills used: {', '.join(skills_used)}")

    projects = profile.get("projects", []) or []
    if projects:
        parts.append("\nPROJECTS:")
        for proj in projects:
            pname = proj.get("name", "")
            tech = proj.get("tech", "")
            date = proj.get("date", "")
            parts.append(f"\n  {pname} ({date})")
            if tech:
                parts.append(f"    Tech: {tech}")
            for h in proj.get("highlights", []):
                parts.append(f"    - {h}")

    blogs = profile.get("blogs", []) or []
    if blogs:
        parts.append("\nBLOGS:")
        for blog in blogs:
            title = blog.get("title", "")
            topic = blog.get("topic", "")
            summary = blog.get("summary", "")
            parts.append(f"  - {title} [{topic}]: {summary}")

    return "\n".join(parts)
