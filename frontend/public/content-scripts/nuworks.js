// NUworks (Symplicity) Content Script
(() => {
  const grab = (selectors) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.innerText?.trim().length > 10) return el.innerText.trim();
    }
    return null;
  };

  const scrapeNuworks = () => {
    const header = grab(['.jobs-detail-header']);
    const description = grab([
      '.field-widget-tinymce',
      '.text-overflow.text-gray',
      '.text-overflow.space-top-lg',
    ]);
    const metadata = grab(['.form.form-readonly', '.form-layout.form-readonly']);
    const companyInfo = grab(['.sidebar-body', '.sidebar-content']);
    const qualificationIssues = grab(['#nonqualify_explanation', '.nonQualifiedForm']);

    const contentParts = [
      header && `=== JOB HEADER ===\n${header}`,
      description && `=== JOB DESCRIPTION ===\n${description}`,
      metadata && `=== JOB DETAILS ===\n${metadata}`,
      companyInfo && `=== ABOUT THE COMPANY ===\n${companyInfo}`,
      qualificationIssues && `=== QUALIFICATION WARNINGS ===\n${qualificationIssues}`,
    ].filter(Boolean);

    if (contentParts.length === 0) return null;

    return {
      platform: 'nuworks',
      url: window.location.href,
      scrapedAt: new Date().toISOString(),
      content: contentParts.join('\n\n'),
    };
  };

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
      const data = scrapeNuworks();
      sendResponse(data);
    }
    return true;
  });
})();
