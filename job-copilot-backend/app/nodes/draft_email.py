from langchain_core.messages import HumanMessage, SystemMessage
from app.llm_providers import get_openai_llm
from app.models.schemas import PipelineState


DRAFT_EMAIL_PROMPT = """You are a career coach who writes effective cold outreach messages for job seekers. Write a brief, genuine LinkedIn message or email to the target person.

Rules:
- Keep it under 100 words
- Be specific about WHY you're reaching out to THIS person (shared school, mutual connection, their work)
- Mention the specific role you're interested in
- Show you've done homework on the company
- Don't be generic or overly formal
- Don't beg or sound desperate
- End with a clear, low-pressure ask (a quick chat, advice, etc.)
- Sound like a real person, not a template

Return ONLY the message text, no subject line, no explanation."""


def draft_cold_email(state: dict) -> dict:
    """Node 4: Draft a cold outreach message using GPT-4o-mini.
    Only runs when recommendation is 'apply_and_outreach'."""
    try:
        # Skip if not recommended for outreach
        if state.get("recommendation") != "apply_and_outreach":
            return state

        parsed_job = state.get("parsed_job", {})
        outreach_targets = parsed_job.get("outreach_targets", [])

        if not outreach_targets:
            return state

        target = outreach_targets[0]  # Draft for the first target

        llm = get_openai_llm(temperature=0.7)

        context = f"""
Target Person: {target.get('name', 'Unknown')}
Their Role: {target.get('role', 'Unknown')}
Connection: {target.get('connection', 'Unknown')}

Job I'm Applying For: {parsed_job.get('title', 'Unknown')} at {parsed_job.get('company', 'Unknown')}
Company Info: {parsed_job.get('company_info', '')}
My Match Score: {state.get('match_score', 'N/A')}/100
My Key Skills: {', '.join([s['skill'] for s in state.get('skill_matches', []) if s.get('status') == 'match'])}
"""

        messages = [
            SystemMessage(content=DRAFT_EMAIL_PROMPT),
            HumanMessage(content=f"Write a cold outreach message:\n{context}"),
        ]

        response = llm.invoke(messages)

        return {
            **state,
            "cold_email_draft": response.content.strip(),
        }
    except Exception as e:
        return {
            **state,
            "cold_email_draft": f"Error drafting email: {str(e)}",
        }
