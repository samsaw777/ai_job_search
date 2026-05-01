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

    # Name: support legacy top-level `name` or new `header.introduction`
    name = profile.get("name") or profile.get("header", {}).get("introduction")
    if name:
        parts.append(f"NAME: {name}")

    # Seeking/availability: support either key
    seeking = profile.get("seeking") or profile.get("availability") or profile.get("header", {}).get("summary")
    if seeking:
        parts.append(f"SEEKING: {seeking}")

    # Normalize skills: support both dict-form and list-of-categories form
    skills_section = {}
    raw_skills = profile.get("skills")
    if isinstance(raw_skills, dict):
        skills_section = raw_skills
    elif isinstance(raw_skills, list):
        # Convert [{category: 'Languages', skills: [...]}, ...] -> {languages: [...], ...}
        for cat in raw_skills:
            if not isinstance(cat, dict):
                continue
            key = cat.get("category") or cat.get("name")
            if not key:
                continue
            normalized = key.lower().replace(" ", "_")
            items = cat.get("skills") or []
            # items may be list of dicts with `name`
            normalized_items = []
            for it in items:
                if isinstance(it, dict):
                    n = it.get("name")
                    if n:
                        normalized_items.append(n)
                elif isinstance(it, str):
                    normalized_items.append(it)
            skills_section[normalized] = normalized_items

    if skills_section:
        parts.append("\nSKILLS:")
        for category, items in skills_section.items():
            if not items:
                continue
            label = category.replace("_", " ").title()
            parts.append(f"  {label}: {', '.join(items)}")

    # Education: support both legacy and new shapes
    education = profile.get("education") or []
    if education:
        parts.append("\nEDUCATION:")
        for edu in education:
            degree = edu.get("degree") or edu.get("subject") or edu.get("degree")
            university = edu.get("university") or edu.get("institution")
            location = edu.get("location", "")
            if degree or university:
                parts.append(f"  - {degree}, {university} ({location})")
            coursework = edu.get("coursework") or []
            if coursework:
                parts.append(f"    Coursework: {', '.join(coursework)}")

    # Experience: accept either legacy keys or new keys
    experience = profile.get("experience") or []
    if experience:
        parts.append("\nEXPERIENCE:")
        for exp in experience:
            title = exp.get("title") or exp.get("position") or exp.get("role")
            company = exp.get("company") or exp.get("employer")
            duration = exp.get("duration") or (
                f"{exp.get('startDate', '')} – {exp.get('endDate', '')}".strip(' – ')
            )
            header_line = ""
            if title or company or duration:
                header_line = f"\n  {title or ''} at {company or ''} ({duration or ''})"
                parts.append(header_line)

            # Highlights: either list or single description
            highlights = exp.get("highlights") or []
            if not highlights:
                desc = exp.get("description") or exp.get("summary")
                if isinstance(desc, str) and desc:
                    highlights = [desc]
            for h in highlights:
                parts.append(f"    - {h}")

            skills_used = exp.get("skills_used") or exp.get("skills") or []
            # If skills_used is list of strings or dicts, normalize
            normalized_skills_used = []
            for s in skills_used:
                if isinstance(s, dict):
                    n = s.get("name")
                    if n:
                        normalized_skills_used.append(n)
                elif isinstance(s, str):
                    normalized_skills_used.append(s)
            if normalized_skills_used:
                parts.append(f"    Skills used: {', '.join(normalized_skills_used)}")

    # Projects: support legacy and new shapes
    projects = profile.get("projects") or []
    if projects:
        parts.append("\nPROJECTS:")
        for proj in projects:
            pname = proj.get("name")
            date = proj.get("date") or proj.get("year")
            parts.append(f"\n  {pname or ''} ({date or ''})")
            tech = proj.get("tech") or (', '.join(proj.get("skills", [])) if proj.get("skills") else "")
            if tech:
                parts.append(f"    Tech: {tech}")
            highlights = proj.get("highlights") or []
            if not highlights:
                desc = proj.get("description")
                if isinstance(desc, str) and desc:
                    highlights = [desc]
            for h in highlights:
                parts.append(f"    - {h}")

    # Blogs (optional)
    blogs = profile.get("blogs") or []
    if blogs:
        parts.append("\nBLOGS:")
        for blog in blogs:
            title = blog.get("title", "")
            topic = blog.get("topic", "")
            summary = blog.get("summary", "")
            parts.append(f"  - {title} [{topic}]: {summary}")

    return "\n".join(parts)
