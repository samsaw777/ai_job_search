import { useState } from "react";

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

export default function AnalysisView({ analysis, scrapedData, onBack }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!analysis) return null;

  const config =
    RECOMMENDATION_CONFIG[analysis.recommendation] ||
    RECOMMENDATION_CONFIG.apply_only;

  return (
    <div className="analysis-view">
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
        <button
          className={`tab ${activeTab === "outreach" ? "active" : ""}`}
          onClick={() => setActiveTab("outreach")}
        >
          Outreach
        </button>
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
    </div>
  );
}
