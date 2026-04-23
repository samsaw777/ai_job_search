import { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import ScrapeButton from "./components/ScrapeButton";
import AnalysisView from "./components/AnalysisView";
import ResumePanel from "./components/ResumePanel";
import PreferencesPanel from "./components/PreferencesPanel";
import SettingsPanel from "./components/SettingsPanel";
import StatusBar from "./components/StatusBar";
import "./App.css";

function App() {
  const [currentView, setCurrentView] = useState("main"); // main | analysis | resume | settings
  const [scrapedData, setScrapedData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [platform, setPlatform] = useState(null);

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

  // Detect on mount
  useEffect(() => {
    detectPlatform();
  }, [detectPlatform]);

  // Re-detect when user switches tabs (side panel stays open!)
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      const handleTabChange = () => {
        detectPlatform();
      };
      chrome.tabs.onActivated.addListener(handleTabChange);
      chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo.status === "complete") handleTabChange();
      });
      return () => {
        chrome.tabs.onActivated.removeListener(handleTabChange);
      };
    }
  }, [detectPlatform]);

  const handleScrape = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (typeof chrome !== "undefined" && chrome.runtime) {
        // Side panel communicates through the background script
        chrome.runtime.sendMessage(
          { action: "scrapeFromSidePanel" },
          (response) => {
            if (chrome.runtime.lastError) {
              setError(
                "Could not read this page. Make sure you're on a job listing.",
              );
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
          },
        );
      } else {
        // Demo mode — use mock data
        const mockData = getMockData();
        setScrapedData(mockData);
        analyzeWithBackend(mockData);
      }
    } catch (err) {
      setError("Something went wrong. Try again.");
      setIsLoading(false);
    }
  };

  // Backend API URL — matches your FastAPI server
  const BACKEND_URL = "http://localhost:8000";

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
          resume: null, // TODO: will add resume later
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Backend error");
      }

      const result = await response.json();

      setAnalysis({
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
      });
      setCurrentView("analysis");
      setIsLoading(false);
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
      setIsLoading(false);
    }
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
          </div>
        )}

        {currentView === "analysis" && (
          <AnalysisView
            analysis={analysis}
            scrapedData={scrapedData}
            onBack={() => setCurrentView("main")}
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
