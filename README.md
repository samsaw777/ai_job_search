# Job Copilot

An AI-powered Chrome extension that analyzes job listings, scores your resume against them, and tells you exactly what to do next — apply, cold email, or skip. When you apply, it logs the job automatically to a Google Sheets tracker.

---

## What it does

Open any job listing on LinkedIn, NUworks, or JobRight, click **Analyze**, and get back:

- **Match score (0–100)** — how well your resume fits the role
- **Recommendation** — Apply Only / Apply + Cold Email / Skip, with reasoning
- **Skill breakdown** — which required skills you have, partially have, or are missing
- **Resume gaps** — specific, actionable suggestions to improve your resume for this role
- **Cold email draft** — a ready-to-send outreach message (<100 words)
- **LinkedIn search queries** — direct links to find recruiters, hiring managers, and Northeastern alumni at the company
- **Apply & Save to Sheets** — one click logs the full application to your Google Sheets tracker

---

## Tech stack

**Chrome Extension (frontend)**
- React 18 + Vite
- Content scripts for LinkedIn, NUworks (Symplicity), JobRight
- Chrome Side Panel API

**Backend (FastAPI)**
- LangGraph pipeline with 5 nodes
- Groq (llama-3.3-70b) — job parsing + strategy decisions
- Google Gemini (gemini-2.5-flash) — resume-job match scoring
- OpenAI (gpt-4o-mini) — cold email drafting + resume bullet rewrites
- gspread — Google Sheets integration

---

## Project structure

```
ai_job_search/
├── job-copilot/                  Chrome extension
│   ├── public/
│   │   ├── manifest.json
│   │   ├── background.js
│   │   └── content-scripts/
│   │       ├── linkedin.js
│   │       ├── nuworks.js
│   │       └── jobright.js
│   └── src/
│       ├── App.jsx
│       └── components/
│           ├── AnalysisView.jsx
│           ├── ResumePanel.jsx
│           ├── PreferencesPanel.jsx
│           └── SettingsPanel.jsx
│
└── job-copilot-backend/          FastAPI backend
    ├── main.py
    ├── app/
    │   ├── config.py
    │   ├── pipeline.py
    │   ├── sheets_client.py
    │   └── nodes/
    │       ├── parse_job.py
    │       ├── match_profile.py
    │       ├── decide_strategy.py
    │       ├── draft_email.py
    │       └── rewrite_resume.py
    └── data/
        └── resume.json
```

---

## Setup

### 1. Backend

```bash
cd job-copilot-backend
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your keys:

```env
# LLM keys
GROQ_API_KEY=gsk_...
GOOGLE_API_KEY=AIza_...
OPENAI_API_KEY=sk-...

# Google Sheets (see section below)
GOOGLE_SERVICE_ACCOUNT_PATH=service_account.json
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
```

Start the server:

```bash
uvicorn main:app --reload
```

### 2. Chrome extension

```bash
cd job-copilot
npm install
npm run build
```

Then in Chrome: go to `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the `job-copilot/dist` folder.

---

## Google Sheets setup

The "Apply & Save to Sheets" feature logs every application you mark as applied to a Google Sheet with these columns:

| Date Applied | Company | Role | Location | Job ID | Job URL | Key Requirements | Salary Range | Visa Sponsorship | ATS Score | Resume Version | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

**One-time setup:**

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project
2. Enable **Google Sheets API** and **Google Drive API**
3. Go to **IAM & Admin → Service Accounts** → create a service account
4. Under the service account → **Keys** tab → **Add Key → JSON** → download the file
5. Rename it to `service_account.json` and place it inside `job-copilot-backend/`
6. Create a Google Sheet for tracking, copy the ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/<THIS_IS_THE_ID>/edit
   ```
7. Share the sheet with the `client_email` from your `service_account.json` (Editor access)
8. Add the path and ID to your `.env`

The header row is created automatically on the first save.

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/resume/text` | Save resume from pasted text |
| `POST` | `/resume/upload` | Upload resume PDF |
| `GET` | `/resume` | Fetch saved resume |
| `POST` | `/preferences` | Save job search preferences |
| `GET` | `/preferences` | Fetch preferences |
| `POST` | `/analyze` | Run full AI analysis pipeline |
| `POST` | `/save-to-sheets` | Append applied job to Google Sheets |

---

## AI pipeline

Each job analysis runs through five nodes in sequence:

```
scrape → parse_job → match_profile → decide_strategy → draft_email → rewrite_resume
         (Groq)       (Gemini)         (Groq)           (OpenAI)      (OpenAI)
```

1. **parse_job** — extracts title, company, location, skills, compensation, outreach targets from raw scraped text
2. **match_profile** — scores resume against job requirements (0–100), lists skill matches and resume gaps
3. **decide_strategy** — recommends Apply Only / Apply + Cold Email / Skip and generates LinkedIn search URLs
4. **draft_email** — writes a personalized cold outreach email under 100 words
5. **rewrite_resume** — suggests improved bullet points tailored to this role

---

## Supported job boards

| Platform | URL pattern |
|----------|------------|
| LinkedIn | `linkedin.com/jobs/*` |
| NUworks (Symplicity) | `northeastern-csm.symplicity.com` |
| JobRight | `jobright.ai` |
