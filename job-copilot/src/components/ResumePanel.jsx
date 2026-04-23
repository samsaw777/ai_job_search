import { useState, useEffect, useRef } from "react";

const BACKEND_URL = "http://localhost:8000";

export default function ResumePanel({ onBack }) {
  const [resumeText, setResumeText] = useState("");
  const [status, setStatus] = useState("loading"); // loading | empty | saved | saving | error
  const [errorMsg, setErrorMsg] = useState("");
  const [mode, setMode] = useState("upload"); // upload | paste
  const [uploadInfo, setUploadInfo] = useState(null); // { pages, chars }
  const fileInputRef = useRef(null);

  // Load existing resume on mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/resume`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "found" && data.resume_text) {
          setResumeText(data.resume_text);
          setStatus("saved");
        } else {
          setStatus("empty");
        }
      })
      .catch(() => {
        setStatus("empty");
      });
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Only PDF files are supported.");
      return;
    }

    setStatus("saving");
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${BACKEND_URL}/resume/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      const data = await res.json();
      setUploadInfo({
        pages: data.pages_read,
        chars: data.characters_extracted,
      });

      // Reload the saved resume text to show in preview
      const resumeRes = await fetch(`${BACKEND_URL}/resume`);
      const resumeData = await resumeRes.json();
      if (resumeData.resume_text) {
        setResumeText(resumeData.resume_text);
      }

      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Could not upload. Is the backend running?");
    }

    // Reset file input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveText = async () => {
    if (!resumeText.trim()) {
      setErrorMsg("Please paste your resume first.");
      return;
    }

    setStatus("saving");
    setErrorMsg("");

    try {
      const res = await fetch(`${BACKEND_URL}/resume/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setUploadInfo(null);
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setErrorMsg("Could not save. Is the backend running?");
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`${BACKEND_URL}/resume`, { method: "DELETE" });
      setResumeText("");
      setUploadInfo(null);
      setStatus("empty");
    } catch {
      setErrorMsg("Could not delete.");
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>My Resume</h2>
        <p className="panel-subtitle">
          Upload your resume once — it's used for every job analysis.
        </p>
      </div>

      {status === "loading" ? (
        <div className="panel-placeholder">
          <p>Loading...</p>
        </div>
      ) : (
        <div className="resume-form">
          {/* Status indicator */}
          <div className="resume-status-bar">
            <span
              className={`resume-status-dot ${status === "saved" ? "saved" : "unsaved"}`}
            />
            <span className="resume-status-text">
              {status === "saved"
                ? `Resume saved${uploadInfo ? ` (${uploadInfo.pages} page${uploadInfo.pages > 1 ? "s" : ""}, ${uploadInfo.chars.toLocaleString()} chars)` : ""}`
                : status === "saving"
                  ? "Processing..."
                  : "No resume saved yet"}
            </span>
          </div>

          {/* Mode toggle */}
          <div className="resume-mode-toggle">
            <button
              className={`mode-btn ${mode === "upload" ? "active" : ""}`}
              onClick={() => setMode("upload")}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1V9M7 1L4 4M7 1L10 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M1 10V12C1 12.5523 1.44772 13 2 13H12C12.5523 13 13 12.5523 13 12V10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Upload PDF
            </button>
            <button
              className={`mode-btn ${mode === "paste" ? "active" : ""}`}
              onClick={() => setMode("paste")}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect
                  x="2"
                  y="1"
                  width="10"
                  height="12"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <line
                  x1="4.5"
                  y1="5"
                  x2="9.5"
                  y2="5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <line
                  x1="4.5"
                  y1="8"
                  x2="8"
                  y2="8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Paste Text
            </button>
          </div>

          {/* Upload mode */}
          {mode === "upload" && (
            <div
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("drag-over");
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove("drag-over");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("drag-over");
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  // Create a synthetic event
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  fileInputRef.current.files = dt.files;
                  handleFileUpload({ target: { files: dt.files } });
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                className="upload-icon"
              >
                <rect
                  x="4"
                  y="4"
                  width="32"
                  height="32"
                  rx="8"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.5"
                />
                <path
                  d="M20 12V24M20 12L15 17M20 12L25 17"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 28H28"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              </svg>
              <p className="upload-text">
                {status === "saving"
                  ? "Processing PDF..."
                  : "Drop your resume PDF here"}
              </p>
              <span className="upload-hint">or click to browse</span>
            </div>
          )}

          {/* Paste mode */}
          {mode === "paste" && (
            <>
              <textarea
                className="resume-textarea"
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  if (status === "saved") setStatus("empty");
                }}
                placeholder="Paste your full resume text here..."
                rows={12}
              />
              <button className="btn-save-resume" onClick={handleSaveText}>
                {status === "saving"
                  ? "Saving..."
                  : status === "saved"
                    ? "✓ Saved"
                    : "Save Resume"}
              </button>
            </>
          )}

          {errorMsg && <div className="resume-error">{errorMsg}</div>}

          {/* Resume preview when saved */}
          {status === "saved" && resumeText && (
            <div className="resume-preview">
              <div className="resume-preview-header">
                <span className="resume-preview-label">
                  Saved Resume Preview
                </span>
                <button className="btn-delete-resume" onClick={handleDelete}>
                  Delete
                </button>
              </div>
              <div className="resume-preview-text">
                {resumeText.substring(0, 500)}
                {resumeText.length > 500 ? "..." : ""}
              </div>
            </div>
          )}

          <p className="resume-hint">
            Tip: Upload your latest resume PDF for the most accurate analysis.
          </p>
        </div>
      )}
    </div>
  );
}
