import re
from datetime import date
from typing import Optional

import gspread
from google.oauth2.service_account import Credentials

from app.config import get_settings

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
]

HEADERS = [
    "Date Applied",
    "Company",
    "Role",
    "Location",
    "Job ID",
    "Job URL",
    "Key Requirements (Top 5)",
    "Salary Range",
    "Visa Sponsorship",
    "ATS Score",
    "Resume Version Used",
    "Status",
    "Notes",
]


def _get_client() -> gspread.Client:
    settings = get_settings()
    if not settings.GOOGLE_SERVICE_ACCOUNT_PATH:
        raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_PATH is not set in .env")
    if not settings.GOOGLE_SHEETS_SPREADSHEET_ID:
        raise RuntimeError("GOOGLE_SHEETS_SPREADSHEET_ID is not set in .env")
    creds = Credentials.from_service_account_file(
        settings.GOOGLE_SERVICE_ACCOUNT_PATH, scopes=SCOPES
    )
    return gspread.authorize(creds)


def _extract_job_id(url: str) -> str:
    """Pull a recognisable ID out of common job board URLs."""
    patterns = [
        r"linkedin\.com/jobs/view/(\d+)",
        r"jobright\.ai/jobs/.*?/(\w{8,})",
        r"symplicity\.com.*?[?&]id=([^&]+)",
    ]
    for pattern in patterns:
        m = re.search(pattern, url)
        if m:
            return m.group(1)
    # Fallback: last path segment or query value
    segment = url.rstrip("/").split("/")[-1].split("?")[0]
    return segment[:40] if segment else "—"


def _detect_visa(raw_skills: list[str], notes: str) -> str:
    """Best-effort visa sponsorship detection from skill list + notes text."""
    haystack = " ".join(raw_skills + [notes]).lower()
    if any(kw in haystack for kw in ("visa sponsor", "will sponsor", "sponsorship provided")):
        return "Yes"
    if any(kw in haystack for kw in ("no visa", "not sponsor", "authorization required", "must be authorized")):
        return "No"
    return "Unknown"


def save_application(
    *,
    company: str,
    role: str,
    location: str,
    job_url: str,
    key_requirements: list[str],
    salary_range: str,
    ats_score: int,
    resume_version: str,
    status: str = "Applied",
    notes: str = "",
    visa_sponsorship: Optional[str] = None,
) -> dict:
    """Append one row to the job-tracker spreadsheet. Returns the row written."""
    settings = get_settings()
    client = _get_client()
    spreadsheet = client.open_by_key(settings.GOOGLE_SHEETS_SPREADSHEET_ID)

    # Use first sheet
    sheet = spreadsheet.sheet1

    # Auto-create header row if the sheet is empty
    existing = sheet.get_all_values()
    if not existing:
        sheet.append_row(HEADERS, value_input_option="RAW")

    job_id = _extract_job_id(job_url)
    top5 = ", ".join(key_requirements[:5]) if key_requirements else "—"
    visa = visa_sponsorship or _detect_visa(key_requirements, notes)

    row = [
        date.today().strftime("%Y-%m-%d"),
        company or "—",
        role or "—",
        location or "—",
        job_id,
        job_url or "—",
        top5,
        salary_range or "—",
        visa,
        ats_score,
        resume_version or "Default",
        status,
        notes,
    ]

    sheet.append_row(row, value_input_option="USER_ENTERED")
    return dict(zip(HEADERS, row))
