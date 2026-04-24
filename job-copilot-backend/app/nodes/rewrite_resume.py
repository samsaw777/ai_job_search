import json
from langchain_core.messages import HumanMessage, SystemMessage
from app.llm_providers import get_openai_llm
from app.models.schemas import PipelineState


REWRITE_PROMPT = """You are an expert resume writer. Given the resume gaps and the job requirements, suggest specific rewritten or new bullet points the candidate should add to their resume.

Rules:
- Write 2-4 bullet points
- Each bullet should be specific, quantified where possible, and use strong action verbs
- Tailor each bullet to address a specific gap or requirement from the job
- Use the STAR format (Situation, Task, Action, Result) compressed into one line
- Don't fabricate experience — suggest how to REFRAME existing skills to match

Return ONLY a JSON array of strings:
["bullet point 1", "bullet point 2", "bullet point 3"]

No markdown, no backticks, no explanation."""


def rewrite_resume_bullets(state: dict) -> dict:
    """Node 5: Suggest resume bullet rewrites using GPT-4o-mini.
    Runs when there are resume gaps identified."""
    try:
        resume_gaps = state.get("resume_gaps", [])
        if not resume_gaps:
            return state

        parsed_job = state.get("parsed_job", {})
        resume_text = state.get("resume_text", "")
        ats_profile_suggestions = state.get("ats_profile_suggestions", [])

        llm = get_openai_llm(temperature=0.7)

        ats_block = ""
        if ats_profile_suggestions:
            ats_block = (
                "\nATS ANALYSIS: The following keywords are missing from the resume. "
                "For each, a specific project or experience from the candidate's profile "
                "has been identified that could be added: "
                f"{json.dumps(ats_profile_suggestions, indent=2)}\n"
            )

        context = f"""
Job Title: {parsed_job.get('title', 'Unknown')}
Company: {parsed_job.get('company', 'Unknown')}
Required Skills: {', '.join(parsed_job.get('required_skills', []))}

Resume Gaps Identified:
{chr(10).join(f'- {gap}' for gap in resume_gaps)}
{ats_block}
Candidate's Current Resume:
{resume_text[:2000] if resume_text else 'Not provided — suggest generic improvements based on the gaps.'}
"""

        messages = [
            SystemMessage(content=REWRITE_PROMPT),
            HumanMessage(content=context),
        ]

        response = llm.invoke(messages)
        content = response.content.strip()

        # Clean up
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        bullets = json.loads(content)

        return {
            **state,
            "rewritten_bullets": bullets if isinstance(bullets, list) else [],
        }
    except Exception as e:
        return {
            **state,
            "rewritten_bullets": [],
        }
