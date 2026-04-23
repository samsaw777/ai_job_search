// Background service worker
// Opens the side panel when the extension icon is clicked

// Open side panel when user clicks the extension icon
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Optional: automatically open side panel on supported job sites
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;

  const url = tab.url || "";
  const isJobSite =
    url.includes("linkedin.com/jobs") ||
    url.includes("symplicity.com") ||
    url.includes("jobright.ai");

  // Enable the side panel on job sites
  if (isJobSite) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "index.html",
      enabled: true,
    });
  }
});

// Listen for messages from side panel to relay to content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "scrapeFromSidePanel") {
    // Get the active tab and send scrape message to its content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "scrape" },
          (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                error:
                  "Could not reach content script. Make sure you are on a job listing page.",
              });
            } else {
              sendResponse(response);
            }
          },
        );
      } else {
        sendResponse({ error: "No active tab found." });
      }
    });
    return true; // Keep channel open for async response
  }
});
