const HISTORY_KEY = "jobCopilotHistory";
const MAX_HISTORY = 5;

function hasStorage() {
  return typeof chrome !== "undefined" && chrome.storage?.local;
}

export function loadHistory() {
  return new Promise((resolve) => {
    if (hasStorage()) {
      chrome.storage.local.get([HISTORY_KEY], (result) => {
        resolve(result[HISTORY_KEY] || []);
      });
    } else {
      try {
        resolve(JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"));
      } catch {
        resolve([]);
      }
    }
  });
}

export function saveToHistory(analysis, scrapedData) {
  return loadHistory().then((history) => {
    const entry = {
      id: Date.now(),
      savedAt: new Date().toISOString(),
      scrapedData: {
        url: scrapedData?.url || "",
        platform: scrapedData?.platform || "",
      },
      analysis,
    };
    const updated = [entry, ...history].slice(0, MAX_HISTORY);
    return new Promise((resolve) => {
      if (hasStorage()) {
        chrome.storage.local.set({ [HISTORY_KEY]: updated }, () => resolve(updated));
      } else {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        resolve(updated);
      }
    });
  });
}
