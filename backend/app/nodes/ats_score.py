import json
import re
from langchain_core.messages import HumanMessage, SystemMessage
from app.llm_providers import get_gemini_llm
from app.profile_loader import load_profile, format_profile_for_prompt


ATS_SYSTEM_PROMPT = """You are an ATS (Applicant Tracking System) resume analyzer. You have three inputs: a job description, the candidate's actual resume text, and their complete professional profile. Your job is to find keywords and skills in the JD that are MISSING from the resume, and then suggest which specific projects or experiences from the full profile should be added to the resume to cover those gaps. Be extremely specific in suggestions — reference actual project names, company names, and bullet points from the profile. Return ONLY valid JSON with keys: ats_keyword_score (0-100), missing_keywords (list of strings), profile_suggestions (list of objects with missing_keyword and suggestion fields)."""


def _extract_json(text: str) -> dict:
    """Extract JSON from an LLM response that might include markdown or prose."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    cleaned = re.sub(r"```(?:json)?\s*", "", text)
    cleaned = re.sub(r"```\s*$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract JSON from ATS response: {text[:200]}")


def ats_score_check(state: dict) -> dict:
    """New node: ATS keyword check. Compares the actual resume text against the JD
    and cross-references the full profile to suggest specific additions."""
    recommendation = state.get("recommendation", "")
    if recommendation not in ("apply_only", "apply_and_outreach"):
        return state

    try:
        profile = load_profile()
        resume_text = state.get("resume_text", "") or ""
        parsed_job = state.get("parsed_job", {}) or {}

        job_block = f"""Job Title: {parsed_job.get('title', 'Unknown')}
Company: {parsed_job.get('company', 'Unknown')}
Required Skills: {', '.join(parsed_job.get('required_skills', []))}
Nice-to-Have Skills: {', '.join(parsed_job.get('nice_to_have_skills', []))}
Responsibilities: {'; '.join(parsed_job.get('responsibilities', []))}
Description: {parsed_job.get('description', '')}"""

        profile_block = format_profile_for_prompt(profile) if profile else "No full profile available."

        user_message = f"""JOB DESCRIPTION:
{job_block}

CANDIDATE'S ACTUAL RESUME TEXT (this is what the ATS will see):
{resume_text if resume_text else 'No resume text available.'}

CANDIDATE'S COMPLETE PROFESSIONAL PROFILE (use this to suggest specific additions):
{profile_block}

Instructions:
1. Extract the key technical keywords and skills from the JOB DESCRIPTION.
2. Check which of those keywords are MISSING from the actual resume text (not the profile).
3. For each missing keyword, look through the complete profile to find a specific project, experience, or bullet point that covers that keyword.
4. In each suggestion, reference the actual project name, company name, or bullet from the profile. Do not give generic advice.

Return ONLY the JSON object described in the system prompt."""

        llm = get_gemini_llm(temperature=0)
        messages = [
            SystemMessage(content=ATS_SYSTEM_PROMPT),
            HumanMessage(content=user_message),
        ]

        response = llm.invoke(messages)
        content = response.content.strip()  # type: ignore

        result = _extract_json(content)

        score = int(result.get("ats_keyword_score", 0) or 0)
        missing = result.get("missing_keywords", []) or []
        suggestions = result.get("profile_suggestions", []) or []

        print(f"[ATS CHECK] Score: {score}/100, Missing: {len(missing)} keywords")

        return {
            **state,
            "ats_keyword_score": score,
            "ats_missing_keywords": missing,
            "ats_profile_suggestions": suggestions,
        }
    except Exception as e:
        print(f"[ATS ERROR] {str(e)}")
        return {
            **state,
            "ats_keyword_score": -1,
            "ats_missing_keywords": [],
            "ats_profile_suggestions": [],
        }
