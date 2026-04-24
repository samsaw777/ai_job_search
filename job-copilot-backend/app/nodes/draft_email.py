from app.models.schemas import PipelineState


EMAIL_PROMPT_TEMPLATE = """You are a professional career outreach assistant. Write a cold email to a recruiter for the role described below.

CONTEXT:
- Job Title: {job_title}
- Company: {company}
- JD Summary: {jd_summary}
- My Matched Skills: {matched_skills}

RULES:
1. Tone: Professional and formal. No desperation, no flattery.
2. Opening: One line referencing the specific role and where I found it.
3. Body: 2-3 sentences connecting my matched skills directly to what the JD expects. Be specific — don't just list skills, show relevance.
4. Ask: One clear, low-pressure call to action (e.g., "Would you be open to a brief conversation?").
5. Length: Under 150 words total.
6. No generic filler like "I'm passionate about" or "I'd love the opportunity to."
7. Subject line: Short, specific, includes the job title.

Output only the subject line and email body. Nothing else."""


LINKEDIN_PROMPT_TEMPLATE = """You are a career outreach assistant. Write a LinkedIn connection request message for someone who works at the company where I just applied to the role described below.

CONTEXT:
- Job Title: {job_title}
- Company: {company}
- JD Summary: {jd_summary}

RULES:
1. HARD LIMIT: 300 characters maximum including spaces. Count carefully.
2. Tone: Warm, curious, and humble. This is NOT a sales pitch.
3. Structure (in this order):
   a. Mention that I recently applied to the {job_title} role at {company}.
   b. Express genuine interest in connecting to learn more about the role, the team, or the day-to-day responsibilities.
   c. End with a low-pressure invite to connect.
4. DO NOT ask for a referral, interview, phone call, or "quick chat about what you look for in candidates." No transactional asks.
5. DO NOT pitch skills, projects, experience, or qualifications. Do not list what I've built or deployed. This message is about curiosity, not self-promotion.
6. No greetings like "Dear" or "Hello". Jump straight in.
7. No generic filler like "I came across your profile" or "I'd love to connect."
8. If the message exceeds 300 characters, shorten it and recount.

Output only the message text and its character count. Nothing else."""


def _build_prompt_context(state: dict) -> dict:
    """Extract common fields from pipeline state for prompt filling."""
    parsed_job = state.get("parsed_job", {})

    matched_skills = [
        s["skill"]
        for s in state.get("skill_matches", [])
        if s.get("status") in ("match", "partial")
    ]

    return {
        "job_title": parsed_job.get("title", "Unknown"),
        "company": parsed_job.get("company", "Unknown"),
        "jd_summary": parsed_job.get("summary", parsed_job.get("company_info", "Not available")),
        "matched_skills": ", ".join(matched_skills) if matched_skills else "None identified",
    }


def draft_cold_email(state: dict) -> dict:
    """Node 4: Build filled prompts for cold email and LinkedIn connection request.
    Only runs when recommendation is 'apply_and_outreach'.
    No LLM call — outputs ready-to-paste prompts."""
    try:
        if state.get("recommendation") != "apply_and_outreach":
            return state

        context = _build_prompt_context(state)

        email_prompt = EMAIL_PROMPT_TEMPLATE.format(**context)
        linkedin_prompt = LINKEDIN_PROMPT_TEMPLATE.format(**context)

        print(f"[DRAFT PROMPTS] Generated for {context['job_title']} at {context['company']}")

        return {
            **state,
            "email_prompt": email_prompt,
            "linkedin_prompt": linkedin_prompt,
            "cold_email_draft": "",  # no longer LLM-generated
        }
    except Exception as e:
        return {
            **state,
            "email_prompt": f"Error building email prompt: {str(e)}",
            "linkedin_prompt": f"Error building LinkedIn prompt: {str(e)}",
            "cold_email_draft": "",
        }   