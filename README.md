# Job Copilot 🚀

**AI-powered browser extension that helps you decide whether to apply, cold email recruiters, or skip a job listing — and helps you tailor your resume for each role.**

Job Copilot sits as a side panel in your browser while you browse jobs on LinkedIn, NUworks, or Jobright. One click analyzes the listing against your resume and preferences, gives you a match score, tells you who to reach out to, and suggests resume improvements.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![LangGraph](https://img.shields.io/badge/LangGraph-1.1-orange)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
  - [4. Load the Extension in Chrome](#4-load-the-extension-in-chrome)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Multi-LLM Strategy](#multi-llm-strategy)
- [Supported Platforms](#supported-platforms)
- [Configuration](#configuration)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

- **Smart Job Analysis** — Scrapes job listings and compares them against your resume using AI
- **Apply / Cold Email / Skip** — Tells you the best strategy for each job
- **Match Score** — 0-100 score showing how well you fit the role
- **Skill Gap Analysis** — Shows which skills match, partially match, or are missing
- **Outreach Search Queries** — Generates ready-to-click LinkedIn search URLs to find recruiters, hiring managers, and alumni at the company
- **Cold Email Drafts** — AI-generated personalized outreach messages
- **Resume Suggestions** — Specific bullet point rewrites tailored to each job
- **Resume Upload** — Upload your PDF resume once, used for every analysis
- **Job Preferences** — Set your target job types, roles, locations, and skills
- **Multi-Platform** — Works on LinkedIn, NUworks (Northeastern), and Jobright
- **Side Panel UI** — Stays open while you browse through jobs
- **Completely Free** — Uses free tiers of Groq, Gemini, and a $5 OpenAI budget

---

## Architecture

```
┌──────────────────────────┐
│   Chrome Extension       │
│   (React Side Panel)     │
│                          │
│  ┌────────────────────┐  │
│  │  Content Scripts    │  │     ┌─────────────────────────────────┐
│  │  (DOM Scrapers)     │──────▶│   FastAPI Backend (localhost)    │
│  │  - LinkedIn         │  │     │                                 │
│  │  - NUworks          │  │     │  ┌───────────────────────────┐  │
│  │  - Jobright         │  │     │  │   LangGraph Pipeline      │  │
│  └────────────────────┘  │     │  │                           │  │
│                          │     │  │  Node 1: Parse Job        │  │
│  ┌────────────────────┐  │     │  │  (Groq / Llama 3.3 70B)  │  │
│  │  Side Panel UI      │  │     │  │          ↓               │  │
│  │  - Analysis View    │◀──────│  │  Node 2: Match Profile   │  │
│  │  - Resume Upload    │  │     │  │  (Gemini 2.5 Flash)     │  │
│  │  - Preferences      │  │     │  │          ↓               │  │
│  │  - Settings         │  │     │  │  Node 3: Decide Strategy │  │
│  └────────────────────┘  │     │  │  (Groq / Llama 3.3 70B)  │  │
└──────────────────────────┘     │  │          ↓               │  │
                                  │  │  Node 4: Draft Email     │  │
                                  │  │  (GPT-4o-mini)          │  │
                                  │  │          ↓               │  │
                                  │  │  Node 5: Resume Rewrite  │  │
                                  │  │  (GPT-4o-mini)          │  │
                                  │  └───────────────────────────┘  │
                                  └─────────────────────────────────┘
```

---

## Tech Stack

| Layer                     | Technology                             |
| ------------------------- | -------------------------------------- |
| Extension UI              | React 18, Vite, CSS                    |
| Extension API             | Chrome Side Panel API, Manifest V3     |
| Content Scripts           | Vanilla JS (DOM scraping)              |
| Backend Server            | FastAPI, Uvicorn                       |
| Pipeline                  | LangGraph, LangChain                   |
| LLM - Parsing & Decisions | Groq (Llama 3.3 70B) — **Free**        |
| LLM - Match Scoring       | Google Gemini 2.5 Flash — **Free**     |
| LLM - Writing             | OpenAI GPT-4o-mini — **~$0.0003/call** |
| Resume Parsing            | PyPDF2                                 |
| Config                    | Pydantic Settings                      |

---

## Project Structure

```
job-copilot/
├── backend/
│   ├── main.py                     # FastAPI server & endpoints
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Environment variables template
│   ├── data/                       # Local storage (resume, preferences)
│   │   ├── resume.json             # Saved resume (auto-created)
│   │   └── preferences.json        # Saved preferences (auto-created)
│   └── app/
│       ├── __init__.py
│       ├── config.py               # Pydantic settings
│       ├── llm_providers.py        # Groq, Gemini, OpenAI setup
│       ├── pipeline.py             # LangGraph pipeline definition
│       ├── resume_store.py         # Resume & preferences storage
│       ├── models/
│       │   ├── __init__.py
│       │   └── schemas.py          # Pydantic models
│       └── nodes/
│           ├── __init__.py
│           ├── parse_job.py        # Node 1: Parse raw text → structured data
│           ├── match_profile.py    # Node 2: Resume vs job matching
│           ├── decide_strategy.py  # Node 3: Apply/outreach/skip decision
│           ├── draft_email.py      # Node 4: Cold email generation
│           └── rewrite_resume.py   # Node 5: Resume bullet suggestions
│
├── extension/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   │   ├── manifest.json           # Chrome extension manifest v3
│   │   ├── background.js           # Service worker (opens side panel)
│   │   ├── icons/                  # Extension icons
│   │   └── content-scripts/
│   │       ├── linkedin.js         # LinkedIn DOM scraper
│   │       ├── nuworks.js          # NUworks (Symplicity) DOM scraper
│   │       └── jobright.js         # Jobright DOM scraper
│   └── src/
│       ├── index.jsx               # React entry point
│       ├── App.jsx                 # Main app component
│       ├── App.css                 # All styles
│       └── components/
│           ├── Header.jsx          # Navigation header
│           ├── ScrapeButton.jsx    # Main scan button
│           ├── AnalysisView.jsx    # Results display
│           ├── ResumePanel.jsx     # Resume upload/paste
│           ├── PreferencesPanel.jsx # Job search preferences
│           ├── SettingsPanel.jsx   # API keys & backend URL
│           └── StatusBar.jsx       # Platform connection status
│
└── README.md
```

---

## Prerequisites

- **Node.js** >= 18 (for building the extension)
- **Python** >= 3.10 (for the backend)
- **Google Chrome** browser
- **API Keys** (all free to obtain):
  - [Groq API Key](https://console.groq.com/) — Free, no credit card
  - [Google Gemini API Key](https://aistudio.google.com/apikey) — Free, no credit card
  - [OpenAI API Key](https://platform.openai.com/api-keys) — Needs $5 credit

---

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/job-copilot.git
cd job-copilot
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your environment file
cp .env.example .env
```

Now edit `.env` and add your API keys:

```env
GROQ_API_KEY=gsk_your_actual_key_here
GOOGLE_API_KEY=AIza_your_actual_key_here
OPENAI_API_KEY=sk-your_actual_key_here
DEBUG=true
```

Start the backend server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Verify it's running:

- Health check: http://localhost:8000
- API docs: http://localhost:8000/docs

### 3. Frontend Setup

Open a **new terminal** (keep the backend running):

```bash
# Navigate to extension
cd extension

# Install dependencies
npm install

# Build the extension
npm run build
```

This creates a `dist/` folder with the compiled extension.

### 4. Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Toggle **Developer mode** ON (top right)
3. Click **"Load unpacked"**
4. Select the `extension/dist/` folder
5. Pin the extension — click the puzzle icon in the toolbar and pin "Job Copilot"

---

## Usage

### First-Time Setup (do this once)

1. **Upload your resume**: Click the extension icon → Menu (⋮) → **My Resume** → Upload your PDF or paste text → Save
2. **Set preferences**: Menu (⋮) → **Preferences** → Set job types (Internship, Co-op), target roles, locations → Save

### Analyzing a Job

1. Go to a job listing on **LinkedIn**, **NUworks**, or **Jobright**
2. Click the Job Copilot extension icon (opens the side panel)
3. Click **"Scan Job Listing"**
4. Wait 5-10 seconds for the AI analysis
5. View your results:
   - **Recommendation**: Apply / Apply + Cold Email / Skip
   - **Match Score**: 0-100 with reasoning
   - **Skills Tab**: Which skills match, partially match, or are missing
   - **Outreach Tab**: People found on the page + LinkedIn search links to find recruiters, hiring managers, and alumni
   - **Resume Tips Tab**: Specific bullet point suggestions

### Outreach Workflow

When the extension recommends cold emailing:

1. Go to the **Outreach** tab
2. Click any LinkedIn search link (opens in new tab)
3. Find a relevant person (recruiter, hiring manager, alumni)
4. Click **"Draft Cold Email"** to generate a personalized message
5. Send the message on LinkedIn

---

## API Endpoints

| Method   | Endpoint         | Description                               |
| -------- | ---------------- | ----------------------------------------- |
| `GET`    | `/`              | Health check                              |
| `POST`   | `/analyze`       | Analyze a job listing against your resume |
| `POST`   | `/resume/upload` | Upload resume PDF                         |
| `POST`   | `/resume/text`   | Save resume as text                       |
| `GET`    | `/resume`        | Get saved resume                          |
| `DELETE` | `/resume`        | Delete saved resume                       |
| `POST`   | `/preferences`   | Save job search preferences               |
| `GET`    | `/preferences`   | Get current preferences                   |
| `DELETE` | `/preferences`   | Reset preferences to defaults             |

### Example: Analyze a Job

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "linkedin",
    "url": "https://linkedin.com/jobs/view/123",
    "scrapedAt": "2026-04-20T10:00:00Z",
    "content": "Software Engineer Intern at Google..."
  }'
```

---

## Multi-LLM Strategy

We use different LLMs for different tasks to optimize cost and quality:

| Task                           | Model            | Provider | Cost           |
| ------------------------------ | ---------------- | -------- | -------------- |
| Parse job listing              | Llama 3.3 70B    | Groq     | Free           |
| Match scoring & skill analysis | Gemini 2.5 Flash | Google   | Free           |
| Apply/outreach/skip decision   | Llama 3.3 70B    | Groq     | Free           |
| Cold email drafts              | GPT-4o-mini      | OpenAI   | ~$0.0003/email |
| Resume bullet rewrites         | GPT-4o-mini      | OpenAI   | ~$0.0003/call  |

**Monthly cost estimate**: $0-1 even with heavy daily use. Your $5 OpenAI budget lasts ~16,000 calls.

---

## Supported Platforms

| Platform               | Status       | How It Works                                        |
| ---------------------- | ------------ | --------------------------------------------------- |
| LinkedIn               | ✅ Supported | Reads the job detail sidebar on search results page |
| NUworks (Northeastern) | ✅ Supported | Reads from Symplicity-powered job detail page       |
| Jobright               | ✅ Supported | Reads job detail panel                              |
| Other sites            | 🔄 Planned   | Universal fallback scraper coming soon              |

---

## Configuration

### Environment Variables

| Variable               | Description                          | Required |
| ---------------------- | ------------------------------------ | -------- |
| `GROQ_API_KEY`         | Groq API key for Llama models        | Yes      |
| `GOOGLE_API_KEY`       | Google AI Studio key for Gemini      | Yes      |
| `OPENAI_API_KEY`       | OpenAI key for GPT-4o-mini           | Yes      |
| `DEBUG`                | Enable auto-reload (`true`/`false`)  | No       |
| `HOST`                 | Server host (default `0.0.0.0`)      | No       |
| `PORT`                 | Server port (default `8000`)         | No       |
| `LANGCHAIN_API_KEY`    | LangSmith key for tracing (optional) | No       |
| `LANGCHAIN_TRACING_V2` | Enable LangSmith tracing             | No       |

### Preferences (set in the extension UI)

| Preference          | Description                    | Example                      |
| ------------------- | ------------------------------ | ---------------------------- |
| Job Types           | What kind of roles to look for | Internship, Co-op            |
| Target Roles        | Specific role titles           | Software Engineer, ML Intern |
| Experience Level    | Your career stage              | Intern/Entry-level           |
| Preferred Locations | Where you want to work         | Boston, MA                   |
| Open to Remote      | Whether remote is acceptable   | Yes/No                       |
| Key Skills          | Skills you want highlighted    | Python, React, AWS           |
| Notes               | Anything else for the AI       | H1B sponsorship needed       |

---

## Development

### Backend Development

```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The `--reload` flag auto-restarts on code changes. Check terminal logs for `[PARSE]`, `[MATCH]`, `[DECIDE]` output from each pipeline node.

### Frontend Development

```bash
cd extension
npm run dev    # Starts Vite dev server (for testing outside Chrome)
npm run build  # Builds for Chrome extension
```

After running `npm run build`:

1. Go to `chrome://extensions`
2. Click the refresh icon (🔄) on Job Copilot
3. Refresh any open LinkedIn/NUworks/Jobright tabs

### Adding a New Platform

1. Create a new content script in `extension/public/content-scripts/newplatform.js`
2. Add the URL pattern to `manifest.json` under `content_scripts` and `host_permissions`
3. The content script should listen for `{ action: 'scrape' }` messages and return `{ platform, url, scrapedAt, content }`

---

## Troubleshooting

### "Could not reach content script"

→ Refresh the job listing page (F5). Content scripts only inject into pages loaded after the extension is installed.

### Side panel is blank

→ Check if `index.html` exists in `extension/dist/`. If not, run `npm run build` again.

### Match score is always 50

→ Check the backend terminal for `[MATCH ERROR]` logs. Common causes:

- Gemini API key is invalid
- Gemini model name is wrong (should be `gemini-2.5-flash`)
- Resume not uploaded yet

### "No resume found" error

→ Open the side panel → Menu → My Resume → Upload your PDF or paste text.

### Backend won't start

→ Make sure your virtual environment is activated and `.env` file exists with valid API keys.

### Extension icon not visible

→ Click the puzzle piece icon in Chrome's toolbar and pin "Job Copilot".

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

Built with ❤️ for job seekers who want to apply smarter, not harder.
