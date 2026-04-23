export default function ScrapeButton({ onScrape, isLoading, platform, hasData }) {
  const isSupported = platform && platform !== 'unsupported';

  return (
    <div className="scrape-section">
      <div className="scrape-illustration">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          {/* Radar / scanning animation */}
          <circle
            cx="60"
            cy="60"
            r="45"
            stroke="var(--accent)"
            strokeWidth="1"
            opacity="0.15"
          />
          <circle
            cx="60"
            cy="60"
            r="30"
            stroke="var(--accent)"
            strokeWidth="1"
            opacity="0.25"
          />
          <circle
            cx="60"
            cy="60"
            r="15"
            stroke="var(--accent)"
            strokeWidth="1.5"
            opacity="0.4"
          />
          {/* Center dot */}
          <circle cx="60" cy="60" r="4" fill="var(--accent)" opacity="0.9">
            {isLoading && (
              <animate
                attributeName="r"
                values="4;8;4"
                dur="1.2s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          {/* Scanning sweep */}
          {isLoading && (
            <g>
              <line
                x1="60"
                y1="60"
                x2="60"
                y2="15"
                stroke="var(--accent)"
                strokeWidth="2"
                opacity="0.6"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 60 60"
                  to="360 60 60"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </line>
              <circle cx="60" cy="60" r="45" stroke="var(--accent)" strokeWidth="2" opacity="0.3">
                <animate
                  attributeName="r"
                  values="15;45"
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.4;0"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          )}
          {/* Data points that appear when not loading */}
          {!isLoading && (
            <g opacity="0.5">
              <circle cx="38" cy="35" r="2.5" fill="var(--accent)" />
              <circle cx="78" cy="42" r="2" fill="var(--green)" />
              <circle cx="45" cy="75" r="2" fill="var(--orange)" />
              <circle cx="82" cy="70" r="2.5" fill="var(--accent)" />
            </g>
          )}
        </svg>
      </div>

      {!isLoading ? (
        <>
          <h2 className="scrape-title">
            {hasData ? 'Analyze Another Job' : 'Analyze This Job'}
          </h2>
          <p className="scrape-subtitle">
            {isSupported
              ? 'Reads the job listing and tells you the best move'
              : platform === 'unsupported'
              ? 'Navigate to LinkedIn, NUworks, or Jobright to get started'
              : 'Click below to try with demo data'}
          </p>
          <button
            className="btn-scrape"
            onClick={onScrape}
            disabled={platform === 'unsupported'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 4C2 2.89543 2.89543 2 4 2H12C13.1046 2 14 2.89543 14 4V12C14 13.1046 13.1046 14 12 14H4C2.89543 14 2 13.1046 2 12V4Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M5 8H11M8 5V11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            {hasData ? 'Scan Again' : 'Scan Job Listing'}
          </button>
        </>
      ) : (
        <>
          <h2 className="scrape-title loading-text">Analyzing...</h2>
          <div className="loading-steps">
            <LoadingStep label="Reading job listing" delay={0} />
            <LoadingStep label="Matching your profile" delay={800} />
            <LoadingStep label="Generating strategy" delay={1600} />
          </div>
        </>
      )}
    </div>
  );
}

function LoadingStep({ label, delay }) {
  return (
    <div
      className="loading-step"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="loading-step-dot" />
      <span>{label}</span>
    </div>
  );
}
