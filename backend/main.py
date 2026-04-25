import io
import logging
import time
import traceback

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader # type: ignore

from app.config import get_settings
from app.models.schemas import AnalyzeRequest
from app.pipeline import pipeline
from app.resume_store import (
    save_resume, get_resume, delete_resume,
    save_preferences, get_preferences, delete_preferences,
)
from app.sheets_client import save_application

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered job application strategy assistant",
    version=settings.APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Error helpers ─────────────────────────────────────────────────────────────

def _classify_error(exc: Exception) -> tuple[int, str]:
    """Map a raw exception to (http_status, user-friendly message)."""
    msg = str(exc).lower()
    name = type(exc).__name__

    if any(kw in msg for kw in ("429", "rate limit", "quota", "resource exhausted", "resourceexhausted")):
        return 429, "Rate limit reached. All Gemini API keys are busy — wait a moment and try again."

    if any(kw in msg for kw in ("api key", "invalid key", "api_key_invalid", "unauthenticated", "permission denied")):
        return 401, "Invalid or missing API key. Check your .env file."

    if any(kw in msg for kw in ("timeout", "timed out", "deadline exceeded")):
        return 504, "The AI service timed out. Try again in a moment."

    if any(kw in msg for kw in ("connection", "network", "unreachable")):
        return 503, "Cannot reach the AI service. Check your internet connection."

    if any(kw in msg for kw in ("no module", "import")):
        return 500, f"Missing dependency ({name}). Run pip install -r requirements.txt."

    return 500, f"{name}: {exc}"


def _raise(exc: Exception):
    """Log full traceback and raise a classified HTTPException."""
    logger.error(traceback.format_exc())
    status, message = _classify_error(exc)
    raise HTTPException(status_code=status, detail=message)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Job Copilot API"}


# ── Resume ────────────────────────────────────────────────────────────────────

class ResumeRequest(BaseModel):
    resume_text: str


@app.post("/resume/text")
async def upload_resume_text(request: ResumeRequest):
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty")
    data = save_resume(request.resume_text.strip())
    return {"status": "saved", "updated_at": data["updated_at"]}


@app.post("/resume/upload")
async def upload_resume_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"): # type: ignore
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    try:
        contents = await file.read()
        reader = PdfReader(io.BytesIO(contents))
        text_parts = [p for page in reader.pages if (p := page.extract_text())]
        resume_text = "\n".join(text_parts).strip()
        if not resume_text:
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from this PDF. Try pasting your resume text instead.",
            )
        data = save_resume(resume_text)
        return {
            "status": "saved",
            "updated_at": data["updated_at"],
            "pages_read": len(reader.pages),
            "characters_extracted": len(resume_text),
            "preview": resume_text[:200] + "..." if len(resume_text) > 200 else resume_text,
        }
    except HTTPException:
        raise
    except Exception as exc:
        _raise(exc)


@app.get("/resume")
async def fetch_resume():
    resume = get_resume()
    if resume is None:
        return {"status": "not_found", "resume_text": None}
    return {"status": "found", "resume_text": resume}


@app.delete("/resume")
async def remove_resume():
    deleted = delete_resume()
    return {"status": "deleted" if deleted else "not_found"}


# ── Preferences ───────────────────────────────────────────────────────────────

class PreferencesRequest(BaseModel):
    job_types: list[str] = ["internship"]
    target_roles: list[str] = []
    experience_level: str = "intern/entry-level"
    preferred_locations: list[str] = []
    open_to_remote: bool = True
    key_skills: list[str] = []
    notes: str = ""


@app.post("/preferences")
async def update_preferences(request: PreferencesRequest):
    data = save_preferences(request.model_dump())
    return {"status": "saved", "updated_at": data["updated_at"]}


@app.get("/preferences")
async def fetch_preferences():
    prefs = get_preferences()
    return {"status": "found", "preferences": prefs}


@app.delete("/preferences")
async def remove_preferences():
    deleted = delete_preferences()
    return {"status": "reset" if deleted else "already_default"}


# ── Analysis ──────────────────────────────────────────────────────────────────

@app.post("/analyze")
async def analyze_job(request: AnalyzeRequest):
    start_time = time.time()

    resume_text = request.resume or ""
    if not resume_text:
        saved = get_resume()
        if saved:
            resume_text = saved

    if not resume_text:
        raise HTTPException(
            status_code=400,
            detail="No resume found. Save your resume first via the Resume panel.",
        )

    try:
        preferences = get_preferences()
        initial_state = {
            "platform": request.platform,
            "url": request.url,
            "raw_content": request.content,
            "resume_text": resume_text,
            "preferences": preferences,
        }

        result = pipeline.invoke(initial_state)
        elapsed = round(time.time() - start_time, 2)
        parsed_job = result.get("parsed_job", {})

        # Surface any pipeline-level error as a warning (not a hard failure)
        pipeline_warning = result.get("error")
        if pipeline_warning:
            logger.warning(f"[Pipeline] Partial failure: {pipeline_warning}")

        return {
            "matchScore": result.get("match_score", 50),
            "recommendation": result.get("recommendation", "apply_only"),
            "recommendationLabel": result.get("recommendation_label", "Just Apply"),
            "reasoning": result.get("reasoning", ""),
            "skillMatches": result.get("skill_matches", []),
            "outreachTargets": parsed_job.get("outreach_targets", []),
            "resumeGaps": result.get("resume_gaps", []),
            "coldEmailDraft": result.get("cold_email_draft", ""),
            "rewrittenBullets": result.get("rewritten_bullets", []),
            "outreachSearchQueries": result.get("outreach_search_queries", []),
            "emailPrompt": result.get("email_prompt", ""),
            "linkedinPrompt": result.get("linkedin_prompt", ""),
            "atsKeywordScore": result.get("ats_keyword_score", -1),
            "atsMissingKeywords": result.get("ats_missing_keywords", []),
            "atsProfileSuggestions": result.get("ats_profile_suggestions", []),
            "parsedJob": {
                "title": parsed_job.get("title", ""),
                "company": parsed_job.get("company", ""),
                "location": parsed_job.get("location", ""),
                "jobType": parsed_job.get("job_type", ""),
                "applicantCount": parsed_job.get("applicant_count", ""),
                "compensation": parsed_job.get("compensation", ""),
            },
            "meta": {
                "elapsed_seconds": elapsed,
                "platform": request.platform,
                "pipelineWarning": pipeline_warning,
            },
        }

    except HTTPException:
        raise
    except Exception as exc:
        _raise(exc)


# ── Save to Sheets ────────────────────────────────────────────────────────────

class SaveToSheetsRequest(BaseModel):
    company: str = ""
    role: str = ""
    location: str = ""
    job_url: str = ""
    key_requirements: list[str] = []
    salary_range: str = ""
    visa_sponsorship: str = "Unknown"
    ats_score: int = 0
    resume_version: str = "Default"
    status: str = "Applied"
    notes: str = ""


@app.post("/save-to-sheets")
async def save_to_sheets(request: SaveToSheetsRequest):
    try:
        row = save_application(
            company=request.company,
            role=request.role,
            location=request.location,
            job_url=request.job_url,
            key_requirements=request.key_requirements,
            salary_range=request.salary_range,
            ats_score=request.ats_score,
            resume_version=request.resume_version,
            status=request.status,
            notes=request.notes,
            visa_sponsorship=request.visa_sponsorship,
        )
        return {"status": "saved", "row": row}
    except HTTPException:
        raise
    except Exception as exc:
        _raise(exc)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)