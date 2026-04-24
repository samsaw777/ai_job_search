from langgraph.graph import StateGraph, END
from app.nodes.parse_job import parse_job_listing
from app.nodes.match_profile import match_profile
from app.nodes.decide_strategy import decide_strategy
from app.nodes.draft_email import draft_cold_email
from app.nodes.rewrite_resume import rewrite_resume_bullets
from app.nodes.ats_score import ats_score_check


def should_continue_after_match(state: dict) -> str:
    skill_matches = state.get("skill_matches", [])
    match_score = state.get("match_score", 100)

    total = len(skill_matches)
    missing = sum(1 for s in skill_matches if s.get("status") == "missing")

    if total > 0 and (missing / total) > 0.65:
        print(f"[EARLY SKIP] Skipping — {missing}/{total} skills missing, score={match_score}")
        return "early_skip"

    if match_score < 25:
        print(f"[EARLY SKIP] Skipping — {missing}/{total} skills missing, score={match_score}")
        return "early_skip"

    return "decide_strategy"


def early_skip(state: dict) -> dict:
    skill_matches = state.get("skill_matches", [])
    total = len(skill_matches)
    missing = sum(1 for s in skill_matches if s.get("status") == "missing")

    return {
        "recommendation": "skip",
        "recommendation_label": "Skip This One",
        "reasoning": (
            f"{missing} out of {total} required skills are missing. "
            "This role is not a good fit based on your current resume."
        ),
        "cold_email_draft": "",
        "rewritten_bullets": [],
        "outreach_search_queries": [],
        "email_prompt": "",
        "linkedin_prompt": "",
    }


def should_draft_email(state: dict) -> str:
    if state.get("recommendation") == "apply_and_outreach":
        return "draft_email"
    return "rewrite_resume"


def should_rewrite(state: dict) -> str:
    if state.get("recommendation") == "skip":
        return "end"
    if state.get("resume_gaps"):
        return "rewrite_resume"
    return "end"


def build_pipeline():
    workflow = StateGraph(dict)

    workflow.add_node("parse_job", parse_job_listing)
    workflow.add_node("match_profile", match_profile)
    workflow.add_node("decide_strategy", decide_strategy)
    workflow.add_node("ats_score", ats_score_check)
    workflow.add_node("draft_email", draft_cold_email)
    workflow.add_node("rewrite_resume", rewrite_resume_bullets)
    workflow.add_node("early_skip", early_skip)

    workflow.set_entry_point("parse_job")

    workflow.add_edge("parse_job", "match_profile")

    workflow.add_conditional_edges(
        "match_profile",
        should_continue_after_match,
        {"decide_strategy": "decide_strategy", "early_skip": "early_skip"},
    )

    workflow.add_edge("early_skip", END)

    workflow.add_edge("decide_strategy", "ats_score")

    workflow.add_conditional_edges(
        "ats_score",
        should_draft_email,
        {"draft_email": "draft_email", "rewrite_resume": "rewrite_resume"},
    )

    workflow.add_conditional_edges(
        "draft_email",
        should_rewrite,
        {"rewrite_resume": "rewrite_resume", "end": END},
    )

    workflow.add_edge("rewrite_resume", END)

    return workflow.compile()


pipeline = build_pipeline()