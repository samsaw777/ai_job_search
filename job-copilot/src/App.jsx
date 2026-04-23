import { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import ScrapeButton from "./components/ScrapeButton";
import AnalysisView from "./components/AnalysisView";
import ResumePanel from "./components/ResumePanel";
import PreferencesPanel from "./components/PreferencesPanel";
import SettingsPanel from "./components/SettingsPanel";
import StatusBar from "./components/StatusBar";
import { loadHistory, saveToHistory } from "./storage";
import "./App.css";

const BACKEND_URL = "http://localhost:8000";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function scoreColor(score) {
  if (score >= 70) return "var(--green)";
  if (score >= 40) return "var(--orange)";
  return "var(--red)";
}

function App() {
  const [currentView, setCurrentView] = useState("main");
  const [scrapedData, setScrapedData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [history, setHistory] = useState([]);

  // Load analysis history from chrome.storage on mount
  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  // Detect platform from active tab URL
  const detectPlatform = useCallback(() => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url || "";
        if (url.includes("linkedin.com")) setPlatform("linkedin");
        else if (url.includes("symplicity.com")) setPlatform("nuworks");
        else if (url.includes("jobright.ai")) setPlatform("jobright");
        else setPlatform("unsupported");
      });
    } else {
      setPlatform("demo");
    }
  }, []);

  useEffect(() => {
    detectPlatform();
  }, [detectPlatform]);

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      const handleTabChange = () => detectPlatform();
      chrome.tabs.onActivated.addListener(handleTabChange);
      chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo.status === "complete") handleTabChange();
      });
      return () => chrome.tabs.onActivated.removeListener(handleTabChange);
    }
  }, [detectPlatform]);

  const handleScrape = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage({ action: "scrapeFromSidePanel" }, (response) => {
          if (chrome.runtime.lastError) {
            setError("Could not read this page. Make sure you're on a job listing.");
            setIsLoading(false);
            return;
          }
          if (response?.error) {
            setError(response.error);
            setIsLoading(false);
            return;
          }
          if (response) {
            setScrapedData(response);
            analyzeWithBackend(response);
          } else {
            setError("No job listing found on this page.");
            setIsLoading(false);
          }
        });
      } else {
        const mockData = getMockData();
        setScrapedData(mockData);
        analyzeWithBackend(mockData);
      }
    } catch {
      setError("Something went wrong. Try again.");
      setIsLoading(false);
    }
  };

  const analyzeWithBackend = async (data) => {
    try {
      const response = await fetch(`${BACKEND_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: data.platform,
          url: data.url,
          scrapedAt: data.scrapedAt,
          content: data.content,
          resume: null,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || "Something went wrong. Try again.");
      }

      const result = await response.json();

      const newAnalysis = {
        matchScore: result.matchScore,
        recommendation: result.recommendation,
        recommendationLabel: result.recommendationLabel,
        reasoning: result.reasoning,
        skillMatches: result.skillMatches,
        outreachTargets: result.outreachTargets,
        resumeGaps: result.resumeGaps,
        coldEmailDraft: result.coldEmailDraft || "",
        rewrittenBullets: result.rewrittenBullets || [],
        outreachSearchQueries: result.outreachSearchQueries || [],
        parsedJob: result.parsedJob || {},
        pipelineWarning: result.meta?.pipelineWarning || null,
      };

      setAnalysis(newAnalysis);

      // Persist to chrome.storage (last 5)
      saveToHistory(newAnalysis, data).then(setHistory);

      setCurrentView("analysis");
      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const restoreFromHistory = (item) => {
    setAnalysis(item.analysis);
    setScrapedData(item.scrapedData);
    setCurrentView("analysis");
  };

  const saveToSheets = async (payload) => {
    const response = await fetch(`${BACKEND_URL}/save-to-sheets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail || "Failed to save to Google Sheets");
    }
    return response.json();
  };

  const getMockData = () => ({
    platform: "linkedin",
    url: "https://linkedin.com/jobs/view/demo",
    scrapedAt: new Date().toISOString(),
    content:
      "PathAI\nMachine Learning Intern/Co-op (Summer/Fall 2026)\nBoston, MA · Over 100 people clicked apply\nInternship\nAbout the job\nPathAI is seeking ML interns...\nRequirements: Python, PyTorch, Computer Vision, TensorFlow...",
  });

  return (
    <div className="app">
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        platform={platform}
      />

      <div className="app-body">
        {currentView === "main" && (
          <div className="main-view">
            <ScrapeButton
              onScrape={handleScrape}
              isLoading={isLoading}
              platform={platform}
              hasData={!!scrapedData}
            />

            {error && <div className="error-toast">{error}</div>}

            {scrapedData && !isLoading && (
              <button
                className="btn-view-analysis"
                onClick={() => setCurrentView("analysis")}
              >
                View Last Analysis →
              </button>
            )}

            {history.length > 0 && (
              <div className="history-section">
                <h4 className="history-title">Recent</h4>
                {history.map((item) => (
                  <button
                    key={item.id}
                    className="history-item"
                    onClick={() => restoreFromHistory(item)}
                  >
                    <span
                      className="history-score"
                      style={{ color: scoreColor(item.analysis.matchScore) }}
                    >
                      {item.analysis.matchScore}
                    </span>
                    <div className="history-info">
                      <span className="history-company">
                        {item.analysis.parsedJob?.company || "Unknown Company"}
                      </span>
                      <span className="history-role">
                        {item.analysis.parsedJob?.title || "Unknown Role"}
                      </span>
                    </div>
                    <span className="history-time">{timeAgo(item.savedAt)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === "analysis" && (
          <AnalysisView
            analysis={analysis}
            scrapedData={scrapedData}
            onBack={() => setCurrentView("main")}
            onSaveToSheets={saveToSheets}
          />
        )}

        {currentView === "resume" && (
          <ResumePanel onBack={() => setCurrentView("main")} />
        )}

        {currentView === "preferences" && (
          <PreferencesPanel onBack={() => setCurrentView("main")} />
        )}

        {currentView === "settings" && (
          <SettingsPanel onBack={() => setCurrentView("main")} />
        )}
      </div>

      <StatusBar platform={platform} />
    </div>
  );
}

export default App;
