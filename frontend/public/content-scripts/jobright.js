// Jobright Content Script
(() => {
  const scrapeJobright = () => {
    const detailSelectors = [
      '[class*="job-detail"]',
      '[class*="jobDetail"]',
      '[class*="JobDetail"]',
      '[class*="job-description"]',
      '[class*="jobDescription"]',
      '[class*="detail-panel"]',
      '[class*="right-panel"]',
      'main',
      '[role="main"]',
      'article',
    ];

    let detail = null;
    for (const sel of detailSelectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el?.innerText?.trim().length > 200) {
          detail = el;
          break;
        }
      }
      if (detail) break;
    }

    // Fallback: keyword-based search for job content
    if (!detail) {
      const candidates = [...document.querySelectorAll('div, section, article')]
        .filter((el) => {
          const text = el.innerText || '';
          const hasJobKeywords =
            /responsibilities|qualifications|requirements|about the role|what you|experience/i.test(
              text
            );
          return text.length > 300 && hasJobKeywords;
        })
        .sort((a, b) => a.innerText.length - b.innerText.length);

      detail =
        candidates.find(
          (el) => el.innerText.length > 500 && el.innerText.length < 15000
        ) || candidates[0];
    }

    if (!detail) {
      detail = document.querySelector('main') || document.body;
    }

    return {
      platform: 'jobright',
      url: window.location.href,
      scrapedAt: new Date().toISOString(),
      content: detail.innerText.substring(0, 8000),
    };
  };

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
      const data = scrapeJobright();
      sendResponse(data);
    }
    return true;
  });
})();
