import json
import os
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
RESUME_FILE = DATA_DIR / "resume.json"
PREFERENCES_FILE = DATA_DIR / "preferences.json"


def ensure_data_dir():
    """Create data directory if it doesn't exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)


# ── Resume ──

def save_resume(resume_text: str) -> dict:
    """Save resume text to local storage."""
    ensure_data_dir()
    data = {
        "resume_text": resume_text,
        "updated_at": __import__("datetime").datetime.now().isoformat(),
    }
    with open(RESUME_FILE, "w") as f:
        json.dump(data, f, indent=2)
    return data


def get_resume() -> str | None:
    """Load saved resume text. Returns None if no resume is saved."""
    if not RESUME_FILE.exists():
        return None
    try:
        with open(RESUME_FILE, "r") as f:
            data = json.load(f)
        return data.get("resume_text")
    except (json.JSONDecodeError, KeyError):
        return None


def delete_resume() -> bool:
    """Delete saved resume."""
    if RESUME_FILE.exists():
        os.remove(RESUME_FILE)
        return True
    return False


# ── Preferences ──

DEFAULT_PREFERENCES = {
    "job_types": ["internship"],
    "target_roles": ["Software Engineer", "ML Engineer", "Data Engineer"],
    "experience_level": "intern/entry-level",
    "preferred_locations": ["Boston, MA"],
    "open_to_remote": True,
    "key_skills": [],
    "notes": "",
}


def save_preferences(preferences: dict) -> dict:
    """Save user job search preferences."""
    ensure_data_dir()
    data = {
        **preferences,
        "updated_at": __import__("datetime").datetime.now().isoformat(),
    }
    with open(PREFERENCES_FILE, "w") as f:
        json.dump(data, f, indent=2)
    return data


def get_preferences() -> dict:
    """Load saved preferences. Returns defaults if none saved."""
    if not PREFERENCES_FILE.exists():
        return DEFAULT_PREFERENCES
    try:
        with open(PREFERENCES_FILE, "r") as f:
            data = json.load(f)
        # Remove metadata fields before returning
        data.pop("updated_at", None)
        return data
    except (json.JSONDecodeError, KeyError):
        return DEFAULT_PREFERENCES


def delete_preferences() -> bool:
    """Delete saved preferences."""
    if PREFERENCES_FILE.exists():
        os.remove(PREFERENCES_FILE)
        return True
    return False