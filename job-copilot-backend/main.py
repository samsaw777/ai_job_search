import time
import io
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PyPDF2 import PdfReader
from app.config import get_settings
from app.models.schemas import AnalyzeRequest
from app.pipeline import pipeline
from app.resume_store import save_resume, get_resume, delete_resume, save_preferences, get_preferences, delete_preferences

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered job application strategy assistant",
    version=settings.APP_VERSION,
)

# Allow requests from Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "Job Copilot API"}


# ── Resume endpoints ──

class ResumeRequest(BaseModel):
    resume_text: str


@app.post("/resume/text")
async def upload_resume_text(request: ResumeRequest):
    """Save resume from pasted text."""
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty")
    data = save_resume(request.resume_text.strip())
    return {"status": "saved", "updated_at": data["updated_at"]}


@app.post("/resume/upload")
async def upload_resume_pdf(file: UploadFile = File(...)):
    """Upload a resume PDF — extracts text and saves it."""

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        contents = await file.read()
        reader = PdfReader(io.BytesIO(contents))

        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")


@app.get("/resume")
async def fetch_resume():
    """Get the currently saved resume."""
    resume = get_resume()
    if resume is None:
        return {"status": "not_found", "resume_text": None}
    return {"status": "found", "resume_text": resume}


@app.delete("/resume")
async def remove_resume():
    """Delete the saved resume."""
    deleted = delete_resume()
    return {"status": "deleted" if deleted else "not_found"}


# ── Preferences endpoints ──

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
    """Save job search preferences."""
    data = save_preferences(request.model_dump())
    return {"status": "saved", "updated_at": data["updated_at"]}


@app.get("/preferences")
async def fetch_preferences():
    """Get current job search preferences."""
    prefs = get_preferences()
    return {"status": "found", "preferences": prefs}


@app.delete("/preferences")
async def remove_preferences():
    """Reset preferences to defaults."""
    deleted = delete_preferences()
    return {"status": "reset" if deleted else "already_default"}


# ── Analysis endpoint ──

@app.post("/analyze")
async def analyze_job(request: AnalyzeRequest):
    """Main endpoint — takes scraped job data, runs the full pipeline,
    returns analysis with recommendation, skill matches, and more."""

    start_time = time.time()

    # Auto-load saved resume if none provided in request
    resume_text = request.resume or ""
    if not resume_text:
        saved_resume = get_resume()
        if saved_resume:
            resume_text = saved_resume

    if not resume_text:
        raise HTTPException(
            status_code=400,
            detail="No resume found. Please save your resume first via the Resume panel in the extension.",
        )

    try:
        # Load user preferences
        preferences = get_preferences()

        # Build initial state for the pipeline
        initial_state = {
            "platform": request.platform,
            "url": request.url,
            "raw_content": request.content,
            "resume_text": resume_text,
            "preferences": preferences,
        }

        # Run the LangGraph pipeline
        result = pipeline.invoke(initial_state)

        elapsed = round(time.time() - start_time, 2)

        # Format response for the Chrome extension
        parsed_job = result.get("parsed_job", {})

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
                "error": result.get("error"),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )