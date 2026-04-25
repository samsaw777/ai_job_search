import { useState } from "react";

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const value = text || "";
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* no-op */
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <button
      className={`btn-copy${copied ? " copied" : ""}`}
      onClick={handleCopy}
      type="button"
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path
              d="M2.5 7L5.5 10L11.5 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Copied!
        </>
      ) : (
        label
      )}
    </button>
  );
}

const RECOMMENDATION_CONFIG = {
  apply_only: {
    label: "Just Apply",
    color: "var(--green)",
    bg: "var(--green-bg)",
    icon: "✓",
    description:
      "Your profile is a strong match. A standard application should work.",
  },
  apply_and_outreach: {
    label: "Apply + Cold Email",
    color: "var(--orange)",
    bg: "var(--orange-bg)",
    icon: "⚡",
    description:
      "Good match but competitive — cold outreach will help you stand out.",
  },
  skip: {
    label: "Skip This One",
    color: "var(--red)",
    bg: "var(--red-bg)",
    icon: "✕",
    description: "Low match. Your time is better spent on other roles.",
  },
};

const SKILL_STATUS_CONFIG = {
  match: { label: "Match", color: "var(--green)", icon: "✓" },
  partial: { label: "Partial", color: "var(--orange)", icon: "~" },
  missing: { label: "Missing", color: "var(--red)", icon: "✕" },
};

export default function AnalysisView({ analysis, scrapedData, onBack, onSaveToSheets }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [notes, setNotes] = useState("");
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [saveError, setSaveError] = useState("");

  if (!analysis) return null;

  const handleSave = async () => {
    setSaveState("saving");
    setSaveError("");
    try {
      await onSaveToSheets({
        company: analysis.parsedJob?.company || "",
        role: analysis.parsedJob?.title || "",
        location: analysis.parsedJob?.location || "",
        job_url: scrapedData?.url || "",
        key_requirements: analysis.skillMatches
          ?.filter((s) => s.status === "match" || s.status === "partial")
          .map((s) => s.skill)
          .slice(0, 5) || [],
        salary_range: analysis.parsedJob?.compensation || "",
        ats_score: analysis.matchScore || 0,
        resume_version: "Default",
        status: "Applied",
        notes,
      });
      setSaveState("saved");
    } catch (err) {
      setSaveError(err.message || "Failed to save");
      setSaveState("error");
    }
  };

  const config =
    RECOMMENDATION_CONFIG[analysis.recommendation] ||
    RECOMMENDATION_CONFIG.apply_only;

  return (
    <div className="analysis-view">
      {/* Pipeline warning — shown when a node partially failed */}
      {analysis.pipelineWarning && (
        <div className="pipeline-warning">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1L12 11.5H1L6.5 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M6.5 5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="6.5" cy="9.5" r="0.6" fill="currentColor"/>
          </svg>
          Some AI nodes ran with errors — results may be incomplete.
        </div>
      )}

      {/* Job Info Header */}
      {analysis.parsedJob &&
        (analysis.parsedJob.title || analysis.parsedJob.company) && (
          <div className="job-info-header">
            <h3 className="job-info-title">
              {analysis.parsedJob.title || "Unknown Role"}
            </h3>
            <div className="job-info-meta">
              {analysis.parsedJob.company && (
                <span className="job-info-company">
                  {analysis.parsedJob.company}
                </span>
              )}
              {analysis.parsedJob.location && (
                <span className="job-info-location">
                  {analysis.parsedJob.location}
                </span>
              )}
              {analysis.parsedJob.jobType && (
                <span className="job-info-type">
                  {analysis.parsedJob.jobType}
                </span>
              )}
            </div>
            {analysis.parsedJob.compensation && (
              <span className="job-info-comp">
                {analysis.parsedJob.compensation}
              </span>
            )}
          </div>
        )}

      {/* Recommendation Card */}
      <div
        className="recommendation-card"
        style={{ "--rec-color": config.color, "--rec-bg": config.bg }}
      >
        <div className="rec-icon">{config.icon}</div>
        <div className="rec-content">
          <h3 className="rec-label">{config.label}</h3>
          <p className="rec-description">{config.description}</p>
        </div>
      </div>

      {/* Match Score Ring */}
      <div className="score-section">
        <div className="score-ring">
          <svg viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="var(--surface-2)"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke={
                analysis.matchScore >= 70
                  ? "var(--green)"
                  : analysis.matchScore >= 40
                    ? "var(--orange)"
                    : "var(--red)"
              }
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(analysis.matchScore / 100) * 213.6} 213.6`}
              transform="rotate(-90 40 40)"
              className="score-ring-progress"
            />
          </svg>
          <div className="score-value">
            <span className="score-number">{analysis.matchScore}</span>
            <span className="score-label">match</span>
          </div>
        </div>
        <p className="score-reasoning">{analysis.reasoning}</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Skills
        </button>
        {analysis.atsKeywordScore >= 0 && (
          <button
            className={`tab ${activeTab === "ats" ? "active" : ""}`}
            onClick={() => setActiveTab("ats")}
          >
            ATS Score
          </button>
        )}
        <button
          className={`tab ${activeTab === "outreach" ? "active" : ""}`}
          onClick={() => setActiveTab("outreach")}
        >
          Outreach
        </button>
        {(analysis.emailPrompt || analysis.linkedinPrompt) && (
          <button
            className={`tab ${activeTab === "prompts" ? "active" : ""}`}
            onClick={() => setActiveTab("prompts")}
          >
            Prompts
          </button>
        )}
        <button
          className={`tab ${activeTab === "resume" ? "active" : ""}`}
          onClick={() => setActiveTab("resume")}
        >
          Resume Tips
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "overview" && (
          <div className="skills-list">
            {analysis.skillMatches.map((skill, i) => {
              const statusConfig = SKILL_STATUS_CONFIG[skill.status];
              return (
                <div key={i} className="skill-row">
                  <span
                    className="skill-indicator"
                    style={{ "--skill-color": statusConfig.color }}
                  >
                    {statusConfig.icon}
                  </span>
                  <span className="skill-name">{skill.skill}</span>
                  <span
                    className="skill-badge"
                    style={{ color: statusConfig.color }}
                  >
                    {statusConfig.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "ats" && (
          <div className="ats-section">
            <div
              className="ats-score-display"
              style={{
                "--ats-color":
                  analysis.atsKeywordScore >= 70
                    ? "var(--green)"
                    : analysis.atsKeywordScore >= 40
                      ? "var(--orange)"
                      : "var(--red)",
              }}
            >
              <span className="ats-score-number">
                {analysis.atsKeywordScore}
              </span>
              <span className="ats-score-max">/ 100</span>
              <span className="ats-score-label">ATS Keyword Score</span>
            </div>

            {analysis.atsMissingKeywords &&
              analysis.atsMissingKeywords.length > 0 && (
                <div className="ats-subsection">
                  <h4 className="ats-subtitle">Missing Keywords</h4>
                  <div className="ats-keywords-list">
                    {analysis.atsMissingKeywords.map((kw, i) => (
                      <span key={i} className="ats-keyword-chip">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {analysis.atsProfileSuggestions &&
              analysis.atsProfileSuggestions.length > 0 && (
                <div className="ats-subsection">
                  <h4 className="ats-subtitle">What to Add to Your Resume</h4>
                  <div className="ats-suggestions-list">
                    {analysis.atsProfileSuggestions.map((item, i) => (
                      <div key={i} className="ats-suggestion-card">
                        <span className="ats-suggestion-tag">
                          {item.missing_keyword}
                        </span>
                        <p className="ats-suggestion-text">{item.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {(!analysis.atsMissingKeywords ||
              analysis.atsMissingKeywords.length === 0) &&
              (!analysis.atsProfileSuggestions ||
                analysis.atsProfileSuggestions.length === 0) && (
                <p className="outreach-empty">
                  No ATS gaps detected — your resume already covers the key
                  keywords from this JD.
                </p>
              )}
          </div>
        )}

        {activeTab === "outreach" && (
          <div className="outreach-section">
            {/* Show found targets from the page */}
            {analysis.outreachTargets.length > 0 && (
              <>
                <p className="outreach-intro">Found on this listing:</p>
                {analysis.outreachTargets.map((person, i) => (
                  <div key={i} className="outreach-card">
                    <div className="outreach-avatar">
                      {person.name?.charAt(0) || "?"}
                    </div>
                    <div className="outreach-info">
                      <span className="outreach-name">{person.name}</span>
                      <span className="outreach-role">{person.role}</span>
                      <span className="outreach-connection">
                        {person.connection}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Search queries to find more people */}
            {analysis.outreachSearchQueries &&
              analysis.outreachSearchQueries.length > 0 && (
                <>
                  <p
                    className="outreach-intro"
                    style={{
                      marginTop:
                        analysis.outreachTargets.length > 0 ? "12px" : "0",
                    }}
                  >
                    Search LinkedIn for people to reach out to:
                  </p>
                  <div className="search-queries-list">
                    {analysis.outreachSearchQueries.map((query, i) => (
                      <a
                        key={i}
                        href={query.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="search-query-link"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <circle
                            cx="5.5"
                            cy="5.5"
                            r="4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M8.5 8.5L12.5 12.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        <span>{query.label}</span>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                          className="external-icon"
                        >
                          <path
                            d="M3 1H9V7M9 1L1 9"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </a>
                    ))}
                  </div>
                </>
              )}

            {analysis.outreachTargets.length === 0 &&
              (!analysis.outreachSearchQueries ||
                analysis.outreachSearchQueries.length === 0) && (
                <p className="outreach-empty">
                  No outreach suggestions available for this listing.
                </p>
              )}

            <button className="btn-draft-email">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 3.5L7 7.5L13 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect
                  x="1"
                  y="2"
                  width="12"
                  height="10"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              Draft Cold Email
            </button>
          </div>
        )}

        {activeTab === "prompts" && (
          <div className="prompts-section">
            {!analysis.emailPrompt && !analysis.linkedinPrompt ? (
              <p className="outreach-empty">
                Prompts are only generated when the recommendation is Apply + Cold Email.
              </p>
            ) : (
              <>
                {analysis.emailPrompt && (
                  <div className="prompt-card">
                    <div className="prompt-header">
                      <div className="prompt-title-row">
                        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                          <rect
                            x="1"
                            y="2"
                            width="12"
                            height="10"
                            rx="1.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <path
                            d="M1 3.5L7 7.5L13 3.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <h4>Cold Email Prompt</h4>
                      </div>
                      <CopyButton text={analysis.emailPrompt} label="Copy Prompt" />
                    </div>
                    <p className="prompt-hint">
                      Copy this prompt and paste it into your preferred LLM to generate a personalized cold email.
                    </p>
                    <pre className="prompt-preview">{analysis.emailPrompt}</pre>
                  </div>
                )}

                {analysis.linkedinPrompt && (
                  <div className="prompt-card">
                    <div className="prompt-header">
                      <div className="prompt-title-row">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <rect
                            x="1"
                            y="1"
                            width="14"
                            height="14"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.4"
                          />
                          <path
                            d="M4.5 6.5V11.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                          <circle cx="4.5" cy="4.5" r="0.8" fill="currentColor" />
                          <path
                            d="M7.5 11.5V8.5C7.5 7.4 8.4 6.5 9.5 6.5C10.6 6.5 11.5 7.4 11.5 8.5V11.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <h4>LinkedIn Connection Prompt</h4>
                      </div>
                      <CopyButton text={analysis.linkedinPrompt} label="Copy Prompt" />
                    </div>
                    <p className="prompt-hint">
                      Copy this prompt to generate a connection request message (300 char limit).
                    </p>
                    <pre className="prompt-preview">{analysis.linkedinPrompt}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "resume" && (
          <div className="resume-tips">
            {analysis.resumeGaps.map((gap, i) => (
              <div key={i} className="resume-tip">
                <span className="tip-number">{i + 1}</span>
                <span className="tip-text">{gap}</span>
              </div>
            ))}
            <button className="btn-rewrite">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M10.5 1.5L12.5 3.5L4.5 11.5H2.5V9.5L10.5 1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Rewrite Bullet Points
            </button>
          </div>
        )}
      </div>

      {/* Apply & Save to Sheets */}
      <div className="save-to-sheets-section">
        <h4 className="save-section-title">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
            <path d="M4 7H10M4 4.5H10M4 9.5H7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          Apply &amp; Log to Google Sheets
        </h4>
        <textarea
          className="notes-input"
          placeholder="Optional notes (e.g. referred by John, heard back in 2 days…)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          disabled={saveState === "saving" || saveState === "saved"}
        />
        {saveState === "saved" ? (
          <div className="save-success">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Saved to your tracker!
          </div>
        ) : (
          <button
            className="btn-save-sheets"
            onClick={handleSave}
            disabled={saveState === "saving"}
          >
            {saveState === "saving" ? (
              "Saving…"
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M1 10v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Applied — Save to Sheets
              </>
            )}
          </button>
        )}
        {saveState === "error" && (
          <p className="save-error">{saveError}</p>
        )}
      </div>
    </div>
  );
}
