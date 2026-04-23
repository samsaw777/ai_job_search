// LinkedIn Content Script - Scrapes job detail sidebar
(() => {
  const scrapeLinkedIn = () => {
    const sidebarSelectors = [
      '.jobs-search__job-details--container',
      '.job-details-jobs-unified-top-card__container--two-pane',
      '.jobs-details__main-content',
      '.scaffold-layout__detail',
      '[class*="job-details"]',
      '[class*="jobs-details"]',
    ];

    let sidebar = null;
    for (const sel of sidebarSelectors) {
      const el = document.querySelector(sel);
      if (el?.innerText?.trim().length > 100) {
        sidebar = el;
        break;
      }
    }

    // Fallback: scaffold layout
    if (!sidebar) {
      const panels = document.querySelectorAll(
        '.scaffold-layout__detail, .scaffold-layout__list-detail-inner > div:last-child'
      );
      for (const p of panels) {
        if (p?.innerText?.trim().length > 200) {
          sidebar = p;
          break;
        }
      }
    }

    // Fallback: position-based
    if (!sidebar) {
      const allSections = [...document.querySelectorAll('section, div')];
      sidebar = allSections
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.left > window.innerWidth * 0.35 && el.innerText.length > 300;
        })
        .sort((a, b) => b.innerText.length - a.innerText.length)[0];
    }

    if (!sidebar) return null;

    return {
      platform: 'linkedin',
      url: window.location.href,
      scrapedAt: new Date().toISOString(),
      content: sidebar.innerText.substring(0, 8000),
    };
  };

  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
      const data = scrapeLinkedIn();
      sendResponse(data);
    }
    return true; // keep channel open for async
  });
})();
