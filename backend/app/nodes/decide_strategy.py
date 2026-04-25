import json
import re
import urllib.parse
from langchain_core.messages import HumanMessage, SystemMessage
from app.llm_providers import get_groq_llm
from app.models.schemas import PipelineState


DECIDE_SYSTEM_PROMPT = """You are a job application strategy advisor. Given the match analysis and job context, decide the best action.

You MUST respond with ONLY a valid JSON object, nothing else.

The JSON must have this exact structure:
{"recommendation": "apply_and_outreach", "recommendation_label": "Apply + Cold Email", "reasoning": "2-3 sentence explanation", "outreach_roles": ["Recruiter", "HR Manager", "Engineering Manager"]}

IMPORTANT RULES FOR DECISION:

APPLY + COLD EMAIL (recommend this for MOST internship/co-op applications):
- For internships and co-ops, cold outreach is ALMOST ALWAYS recommended because:
  * Internship hiring is heavily relationship-driven
  * Recruiters get hundreds of intern applications — standing out matters
  * A referral or warm intro dramatically increases interview chances
- Match score is 40-85 (you have some relevant skills)
- The company is any size (outreach helps everywhere)
- Even if no outreach targets are shown on the page, recommend outreach because the user can search for people

JUST APPLY (rare, only when outreach adds no value):
- Match score is above 85 and it's a high-volume Easy Apply role
- Very large company (10,000+ employees) with fully automated hiring
- The role is generic entry-level with thousands of openings

SKIP:
- Match score is below 25
- Role fundamentally doesn't match (e.g., requires 5+ years for an intern)
- Qualification warnings indicate ineligibility

For "outreach_roles": suggest 2-4 specific job titles to search for at this company. Consider:
- The hiring team: "Engineering Manager", "Software Engineering Lead", "ML Team Lead"
- Recruiters: "Technical Recruiter", "University Recruiter", "Talent Acquisition"
- HR: "HR Manager", "People Operations"
- Alumni: suggest searching for alumni from the candidate's school

RESPOND WITH ONLY THE JSON OBJECT."""


def extract_json(text: str) -> dict:
    """Robustly extract JSON from LLM response."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    cleaned = re.sub(r'```(?:json)?\s*', '', text)
    cleaned = re.sub(r'```\s*$', '', cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    match = re.search(r'\{[\s\S]*\}', text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass
    raise ValueError(f"Could not extract JSON from: {text[:200]}")


def generate_search_queries(company: str, outreach_roles: list[str], school: str = "Northeastern University") -> list[dict]:
    """Generate LinkedIn search URLs for finding people to reach out to."""
    queries = []

    for role in outreach_roles:
        search_term = f"{role} {company}"
        url = f"https://www.linkedin.com/search/results/people/?keywords={urllib.parse.quote(search_term)}"
        queries.append({
            "label": f"{role} at {company}",
            "query": search_term,
            "url": url,
        })

    # Always add an alumni search
    alumni_search = f"{company} {school}"
    alumni_url = f"https://www.linkedin.com/search/results/people/?keywords={urllib.parse.quote(alumni_search)}"
    queries.append({
        "label": f"{school} alumni at {company}",
        "query": alumni_search,
        "url": alumni_url,
    })

    return queries


def decide_strategy(state: dict) -> dict:
    """Node 3: Decide whether to apply only, cold email, or skip using Groq.
    Also generates LinkedIn search queries for finding outreach targets."""
    try:
        llm = get_groq_llm(temperature=0)

        parsed_job = state.get("parsed_job", {})
        outreach_targets = parsed_job.get("outreach_targets", [])
        preferences = state.get("preferences", {})

        context = f"""
Match Score: {state.get('match_score', 50)}/100
Match Reasoning: {state.get('reasoning', 'N/A')}

Job Title: {parsed_job.get('title', 'Unknown')}
Company: {parsed_job.get('company', 'Unknown')}
Company Size: {parsed_job.get('company_size', 'Unknown')}
Applicant Count: {parsed_job.get('applicant_count', 'Unknown')}
Posting Age: {parsed_job.get('posting_age', 'Unknown')}
Job Type: {parsed_job.get('job_type', 'Unknown')}

Outreach Targets Already Found on Page: {len(outreach_targets)}
{json.dumps(outreach_targets, indent=2) if outreach_targets else 'None found on page — but user can search LinkedIn for people'}

Skill Matches: {json.dumps(state.get('skill_matches', []), indent=2)}
Resume Gaps: {json.dumps(state.get('resume_gaps', []), indent=2)}

Candidate Preferences:
Looking for: {', '.join(preferences.get('job_types', ['any']))}
Target roles: {', '.join(preferences.get('target_roles', ['any']))}
Experience level: {preferences.get('experience_level', 'not specified')}
"""

        messages = [
            SystemMessage(content=DECIDE_SYSTEM_PROMPT),
            HumanMessage(content=context),
        ]

        response = llm.invoke(messages)
        content = response.content.strip()

        print(f"[DECIDE] Raw Groq response ({len(content)} chars): {content[:300]}")

        result = extract_json(content)

        print(f"[DECIDE] Decision: {result.get('recommendation')}")

        # Generate LinkedIn search queries for outreach
        company = parsed_job.get("company", "Unknown")
        outreach_roles = result.get("outreach_roles", ["Technical Recruiter", "Engineering Manager"])
        
        # Get school from preferences notes or default
        school = "Northeastern University"
        
        search_queries = generate_search_queries(company, outreach_roles, school)

        return {
            **state,
            "recommendation": result.get("recommendation", "apply_and_outreach"),
            "recommendation_label": result.get("recommendation_label", "Apply + Cold Email"),
            "reasoning": result.get("reasoning", state.get("reasoning", "")),
            "outreach_search_queries": search_queries,
        }
    except Exception as e:
        print(f"[DECIDE ERROR] {str(e)}")
        return {
            **state,
            "error": f"Decision error: {str(e)}",
            "recommendation": "apply_and_outreach",
            "recommendation_label": "Apply + Cold Email",
            "outreach_search_queries": [],
        }