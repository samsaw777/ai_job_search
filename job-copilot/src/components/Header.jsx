import { useState } from "react";

const PLATFORM_LABELS = {
  linkedin: "LinkedIn",
  nuworks: "NUworks",
  jobright: "Jobright",
  unsupported: "Unsupported",
  demo: "Demo Mode",
};

const PLATFORM_COLORS = {
  linkedin: "#0a66c2",
  nuworks: "#c8102e",
  jobright: "#6c5ce7",
  unsupported: "#666",
  demo: "#f59e0b",
};

export default function Header({ currentView, onNavigate, platform }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-left">
        {currentView !== "main" ? (
          <button className="btn-back" onClick={() => onNavigate("main")}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 12L6 8L10 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : (
          <div className="logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                fill="var(--accent)"
                opacity="0.9"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="logo-text">Job Copilot</span>
          </div>
        )}
      </div>

      <div className="header-center">
        {platform && platform !== "unsupported" && (
          <span
            className="platform-badge"
            style={{
              "--badge-color": PLATFORM_COLORS[platform] || "#666",
            }}
          >
            {PLATFORM_LABELS[platform]}
          </span>
        )}
      </div>

      <div className="header-right">
        <button
          className="btn-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="4" r="1.5" fill="currentColor" />
            <circle cx="9" cy="9" r="1.5" fill="currentColor" />
            <circle cx="9" cy="14" r="1.5" fill="currentColor" />
          </svg>
        </button>

        {menuOpen && (
          <div className="dropdown-menu">
            <button
              onClick={() => {
                onNavigate("resume");
                setMenuOpen(false);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect
                  x="2"
                  y="1"
                  width="10"
                  height="12"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="4.5"
                  y1="4.5"
                  x2="9.5"
                  y2="4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="4.5"
                  y1="7"
                  x2="9.5"
                  y2="7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="4.5"
                  y1="9.5"
                  x2="7.5"
                  y2="9.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              My Resume
            </button>
            <button
              onClick={() => {
                onNavigate("preferences");
                setMenuOpen(false);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 4H12M2 7H8M2 10H10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Preferences
            </button>
            <button
              onClick={() => {
                onNavigate("settings");
                setMenuOpen(false);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle
                  cx="7"
                  cy="7"
                  r="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M7 1V3M7 11V13M1 7H3M11 7H13M2.76 2.76L4.17 4.17M9.83 9.83L11.24 11.24M11.24 2.76L9.83 4.17M4.17 9.83L2.76 11.24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Settings
            </button>
            <div className="dropdown-divider" />
            <span className="dropdown-version">v1.0.0</span>
          </div>
        )}
      </div>
    </header>
  );
}
