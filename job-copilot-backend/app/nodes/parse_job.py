import json
import re
from langchain_core.messages import HumanMessage, SystemMessage
from app.llm_providers import get_groq_llm
from app.models.schemas import PipelineState


PARSE_SYSTEM_PROMPT = """You are a job listing parser. Given raw text scraped from a job listing page, extract structured information.

Return ONLY valid JSON with these fields:
{
  "title": "job title",
  "company": "company name",
  "location": "city, state or remote",
  "job_type": "internship/full-time/co-op/contract",
  "experience_level": "entry/mid/senior/intern",
  "description": "brief 2-3 sentence summary of the role",
  "responsibilities": ["list", "of", "key", "responsibilities"],
  "required_skills": ["list", "of", "required", "skills"],
  "nice_to_have_skills": ["list", "of", "nice", "to", "have", "skills"],
  "compensation": "$XX/hr or $XXk/yr or empty string if not listed",
  "applicant_count": "number of applicants if mentioned, else empty string",
  "posting_age": "how long ago it was posted, else empty string",
  "outreach_targets": [{"name": "Person Name", "role": "Their Title", "connection": "2nd connection / alumni / etc"}],
  "company_size": "number of employees if mentioned, else empty string",
  "company_info": "brief 1-2 sentence company description"
}

Rules:
- Extract ONLY what is explicitly stated in the text. Do not invent information.
- For outreach_targets, look for sections like "People you can reach out to" or any mentioned employees/recruiters.
- If a field is not found in the text, use an empty string or empty list.
- Return ONLY the JSON object, no markdown, no backticks, no explanation."""


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


def parse_job_listing(state: dict) -> dict:
    """Node 1: Parse raw scraped text into structured job data using Groq."""
    try:
        llm = get_groq_llm(temperature=0)

        messages = [
            SystemMessage(content=PARSE_SYSTEM_PROMPT),
            HumanMessage(content=f"Parse this job listing:\n\n{state['raw_content'][:6000]}"),
        ]

        response = llm.invoke(messages)
        content = response.content.strip() # type: ignore

        print(f"[PARSE] Raw Groq response ({len(content)} chars): {content[:300]}")

        parsed = extract_json(content)

        print(f"[PARSE] Parsed: {parsed.get('title')} at {parsed.get('company')}")

        return {
            **state,
            "parsed_job": parsed,
        }
    except Exception as e:
        print(f"[PARSE ERROR] {str(e)}")
        return {
            **state,
            "error": f"Parse error: {str(e)}",
            "parsed_job": {
                "title": "Unknown",
                "company": "Unknown",
                "required_skills": [],
                "nice_to_have_skills": [],
                "responsibilities": [],
                "outreach_targets": [],
            },
        }