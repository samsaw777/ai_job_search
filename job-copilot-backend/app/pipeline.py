from langgraph.graph import StateGraph, END
from app.nodes.parse_job import parse_job_listing
from app.nodes.match_profile import match_profile
from app.nodes.decide_strategy import decide_strategy
from app.nodes.draft_email import draft_cold_email
from app.nodes.rewrite_resume import rewrite_resume_bullets


def should_draft_email(state: dict) -> str:
    """Conditional edge: only draft email if outreach is recommended."""
    if state.get("recommendation") == "apply_and_outreach":
        return "draft_email"
    return "rewrite_resume"


def should_rewrite(state: dict) -> str:
    """Conditional edge: only rewrite if there are gaps and not skipping."""
    if state.get("recommendation") == "skip":
        return "end"
    if state.get("resume_gaps"):
        return "rewrite_resume"
    return "end"


def build_pipeline():
    """Build the LangGraph pipeline.

    Flow:
        parse_job → match_profile → decide_strategy
                                        ├── (apply_and_outreach) → draft_email → rewrite_resume → END
                                        ├── (apply_only) → rewrite_resume → END
                                        └── (skip) → END
    """

    workflow = StateGraph(dict)

    # Add nodes
    workflow.add_node("parse_job", parse_job_listing)
    workflow.add_node("match_profile", match_profile)
    workflow.add_node("decide_strategy", decide_strategy)
    workflow.add_node("draft_email", draft_cold_email)
    workflow.add_node("rewrite_resume", rewrite_resume_bullets)

    # Set entry point
    workflow.set_entry_point("parse_job")

    # Linear flow: parse → match → decide
    workflow.add_edge("parse_job", "match_profile")
    workflow.add_edge("match_profile", "decide_strategy")

    # Conditional branching after decision
    workflow.add_conditional_edges(
        "decide_strategy",
        should_draft_email,
        {
            "draft_email": "draft_email",
            "rewrite_resume": "rewrite_resume",
        },
    )

    # After email draft, do resume rewrite
    workflow.add_conditional_edges(
        "draft_email",
        should_rewrite,
        {
            "rewrite_resume": "rewrite_resume",
            "end": END,
        },
    )

    # After resume rewrite, end
    workflow.add_edge("rewrite_resume", END)

    return workflow.compile()


# Singleton pipeline instance
pipeline = build_pipeline()
