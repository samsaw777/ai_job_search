import json
import re
from langchain_core.messages import HumanMessage, SystemMessage
from app.llm_providers import get_gemini_llm
from app.models.schemas import PipelineState
from app.profile_loader import load_profile, format_profile_for_prompt


MATCH_SYSTEM_PROMPT = """You are a job match analyzer. Given a parsed job listing and a candidate's COMPLETE PROFESSIONAL PROFILE (skills, all experience, all projects, education, blogs) along with their job search preferences, analyze the fit.

You MUST respond with ONLY a valid JSON object, nothing else. No markdown, no backticks, no explanation before or after.

The JSON must have this exact structure:
{"match_score": 72, "skill_matches": [{"skill": "Python", "status": "match"}, {"skill": "Docker", "status": "missing"}], "resume_gaps": ["Add Docker experience"], "reasoning": "Good match because..."}

Scoring guidelines:
- 80-100: Strong match. Most required skills present, relevant experience, role aligns with candidate preferences.
- 60-79: Good match with some gaps. Transferable skills cover most requirements.
- 40-59: Moderate match. Several missing skills but some overlap.
- 20-39: Weak match. Most required skills are missing.
- 0-19: Poor match. Role type doesn't align with what the candidate is looking for.

IMPORTANT: Factor in the candidate's preferences:
- If the candidate is looking for internships and the role is a full-time senior position, score LOWER.
- If the role location doesn't match preferred locations and candidate is not open to remote, score LOWER.
- If the role aligns perfectly with target roles and job type preferences, score HIGHER.

For skill_matches status: "match" = has it, "partial" = related experience, "missing" = not found. The candidate has many projects and experiences — check ALL of them for relevant skills, not just job titles. A skill found in any project, experience bullet, blog, or coursework counts as a match or partial match.

For resume_gaps: give specific, actionable suggestions.

RESPOND WITH ONLY THE JSON OBJECT."""


def extract_json(text: str) -> dict:
    """Robustly extract JSON from LLM response that might contain extra text."""
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Remove markdown code blocks
    cleaned = re.sub(r'```(?:json)?\s*', '', text)
    cleaned = re.sub(r'```\s*$', '', cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Find JSON object in the text
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Could not extract JSON from response: {text[:200]}")


def match_profile(state: dict) -> dict:
    """Node 2: Compare job requirements against the candidate's full profile using Gemini."""
    try:
        llm = get_gemini_llm(temperature=0)

        parsed_job = state.get("parsed_job", {})
        resume = state.get("resume_text", "")

        profile = load_profile()
        if profile:
            candidate_block = format_profile_for_prompt(profile)
            candidate_header = "CANDIDATE COMPLETE PROFESSIONAL PROFILE"
        elif resume:
            candidate_block = resume
            candidate_header = "CANDIDATE RESUME"
        else:
            return {
                **state,
                "error": "No resume or profile provided",
                "match_score": 0,
                "skill_matches": [],
                "resume_gaps": ["Please save your resume in the Resume panel first."],
                "reasoning": "Cannot analyze match without a resume or profile.",
            }

        job_summary = f"""
Job Title: {parsed_job.get('title', 'Unknown')}
Company: {parsed_job.get('company', 'Unknown')}
Required Skills: {', '.join(parsed_job.get('required_skills', []))}
Nice-to-Have Skills: {', '.join(parsed_job.get('nice_to_have_skills', []))}
Responsibilities: {'; '.join(parsed_job.get('responsibilities', []))}
Experience Level: {parsed_job.get('experience_level', 'Unknown')}
"""

        # Add preferences context
        preferences = state.get("preferences", {})
        candidate_context = f"""{candidate_header}:
{candidate_block}

CANDIDATE PREFERENCES:
Looking for: {', '.join(preferences.get('job_types', ['any']))}
Target roles: {', '.join(preferences.get('target_roles', ['any']))}
Experience level: {preferences.get('experience_level', 'not specified')}
Preferred locations: {', '.join(preferences.get('preferred_locations', ['any']))}
Open to remote: {'Yes' if preferences.get('open_to_remote', True) else 'No'}
Key skills to highlight: {', '.join(preferences.get('key_skills', [])) or 'not specified'}
Additional notes: {preferences.get('notes', '') or 'none'}"""

        messages = [
            SystemMessage(content=MATCH_SYSTEM_PROMPT),
            HumanMessage(content=f"JOB LISTING:\n{job_summary}\n\n{candidate_context}"),
        ]

        response = llm.invoke(messages)
        content = response.content.strip() # type: ignore

        print(f"[MATCH] Raw Gemini response ({len(content)} chars): {content[:300]}")

        result = extract_json(content)

        print(f"[MATCH] Parsed result: score={result.get('match_score')}, skills={len(result.get('skill_matches', []))}")

        return {
            **state,
            "match_score": result.get("match_score", 50),
            "skill_matches": result.get("skill_matches", []),
            "resume_gaps": result.get("resume_gaps", []),
            "reasoning": result.get("reasoning", ""),
        }
    except Exception as e:
        print(f"[MATCH ERROR] {str(e)}")
        return {
            **state,
            "error": f"Match error: {str(e)}",
            "match_score": 50,
            "skill_matches": [],
            "resume_gaps": [],
            "reasoning": "Could not analyze match — using default score.",
        }