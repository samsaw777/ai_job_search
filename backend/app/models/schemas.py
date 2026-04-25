from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# === Request from the Chrome extension ===
class AnalyzeRequest(BaseModel):
    platform: str = Field(description="Source platform: linkedin, nuworks, jobright")
    url: str = Field(description="URL of the job listing")
    scraped_at: str = Field(alias="scrapedAt", description="ISO timestamp of when the page was scraped")
    content: str = Field(description="Raw text scraped from the job listing page")
    resume: Optional[str] = Field(default=None, description="User's resume text (optional for now)")


# === Structured job data after parsing ===
class ParsedJob(BaseModel):
    title: str = ""
    company: str = ""
    location: str = ""
    job_type: str = ""  # internship, full-time, co-op, etc.
    experience_level: str = ""
    description: str = ""
    responsibilities: list[str] = []
    required_skills: list[str] = []
    nice_to_have_skills: list[str] = []
    compensation: str = ""
    applicant_count: str = ""
    posting_age: str = ""
    outreach_targets: list[dict] = []  # [{name, role, connection}]
    company_size: str = ""
    company_info: str = ""


# === Skill match result ===
class SkillMatchStatus(str, Enum):
    MATCH = "match"
    PARTIAL = "partial"
    MISSING = "missing"


class SkillMatch(BaseModel):
    skill: str
    status: SkillMatchStatus


# === Recommendation ===
class RecommendationType(str, Enum):
    APPLY_ONLY = "apply_only"
    APPLY_AND_OUTREACH = "apply_and_outreach"
    SKIP = "skip"


# === Full analysis result ===
class AnalysisResult(BaseModel):
    match_score: int = Field(ge=0, le=100, alias="matchScore")
    recommendation: RecommendationType
    recommendation_label: str = Field(alias="recommendationLabel")
    reasoning: str
    skill_matches: list[SkillMatch] = Field(alias="skillMatches")
    outreach_targets: list[dict] = Field(alias="outreachTargets")
    resume_gaps: list[str] = Field(alias="resumeGaps")

    model_config = {"populate_by_name": True}


# === LangGraph pipeline state ===
class PipelineState(BaseModel):
    """State that flows through the LangGraph pipeline."""
    # Input
    platform: str = ""
    url: str = ""
    raw_content: str = ""
    resume_text: str = ""

    # After Node 1: Parse
    parsed_job: Optional[ParsedJob] = None

    # After Node 2: Match
    match_score: int = 0
    skill_matches: list[dict] = []
    resume_gaps: list[str] = []

    # After Node 3: Decide
    recommendation: str = "apply_only"
    recommendation_label: str = "Just Apply"
    reasoning: str = ""

    # After Node 4: Outreach draft (optional)
    cold_email_draft: str = ""

    # After Node 5: Resume rewrites (optional)
    rewritten_bullets: list[str] = []

    # Error tracking
    error: Optional[str] = None

    model_config = {"arbitrary_types_allowed": True}
