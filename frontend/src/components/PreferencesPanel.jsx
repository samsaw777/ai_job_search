import { useState, useEffect } from "react";

const BACKEND_URL = "http://localhost:8000";

const JOB_TYPE_OPTIONS = [
  "Internship",
  "Co-op",
  "Full-time",
  "Part-time",
  "Contract",
];
const EXPERIENCE_OPTIONS = ["Intern/Entry-level", "Mid-level", "Senior"];

export default function PreferencesPanel({ onBack }) {
  const [prefs, setPrefs] = useState({
    job_types: ["internship"],
    target_roles: [],
    experience_level: "intern/entry-level",
    preferred_locations: [],
    open_to_remote: true,
    key_skills: [],
    notes: "",
  });
  const [roleInput, setRoleInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`${BACKEND_URL}/preferences`)
      .then((res) => res.json())
      .then((data) => {
        if (data.preferences) {
          setPrefs(data.preferences);
        }
        setStatus("loaded");
      })
      .catch(() => setStatus("loaded"));
  }, []);

  const handleSave = async () => {
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch(`${BACKEND_URL}/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error("Failed to save");
      setStatus("saved");
      setTimeout(() => setStatus("loaded"), 2000);
    } catch {
      setErrorMsg("Could not save. Is the backend running?");
      setStatus("loaded");
    }
  };

  const toggleJobType = (type) => {
    const lower = type.toLowerCase();
    setPrefs((p) => ({
      ...p,
      job_types: p.job_types.includes(lower)
        ? p.job_types.filter((t) => t !== lower)
        : [...p.job_types, lower],
    }));
  };

  const addTag = (field, value, setter) => {
    if (!value.trim()) return;
    setPrefs((p) => ({
      ...p,
      [field]: [...new Set([...p[field], value.trim()])],
    }));
    setter("");
  };

  const removeTag = (field, value) => {
    setPrefs((p) => ({
      ...p,
      [field]: p[field].filter((v) => v !== value),
    }));
  };

  if (status === "loading") {
    return (
      <div className="panel">
        <div className="panel-placeholder">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Job Preferences</h2>
        <p className="panel-subtitle">
          Tell us what you're looking for — this makes the analysis more
          accurate.
        </p>
      </div>

      <div className="prefs-form">
        {/* Job Types */}
        <div className="prefs-group">
          <label className="prefs-label">Job type I'm looking for</label>
          <div className="prefs-chips">
            {JOB_TYPE_OPTIONS.map((type) => (
              <button
                key={type}
                className={`prefs-chip ${prefs.job_types.includes(type.toLowerCase()) ? "active" : ""}`}
                onClick={() => toggleJobType(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Experience Level */}
        <div className="prefs-group">
          <label className="prefs-label">Experience level</label>
          <div className="prefs-chips">
            {EXPERIENCE_OPTIONS.map((level) => (
              <button
                key={level}
                className={`prefs-chip ${prefs.experience_level === level.toLowerCase() ? "active" : ""}`}
                onClick={() =>
                  setPrefs((p) => ({
                    ...p,
                    experience_level: level.toLowerCase(),
                  }))
                }
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Target Roles */}
        <div className="prefs-group">
          <label className="prefs-label">Target roles</label>
          <div className="prefs-tag-input">
            <input
              type="text"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                addTag("target_roles", roleInput, setRoleInput)
              }
              placeholder="e.g. Software Engineer, ML Intern..."
            />
            <button
              onClick={() => addTag("target_roles", roleInput, setRoleInput)}
            >
              +
            </button>
          </div>
          <div className="prefs-tags">
            {prefs.target_roles.map((role) => (
              <span key={role} className="prefs-tag">
                {role}
                <button onClick={() => removeTag("target_roles", role)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Preferred Locations */}
        <div className="prefs-group">
          <label className="prefs-label">Preferred locations</label>
          <div className="prefs-tag-input">
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                addTag("preferred_locations", locationInput, setLocationInput)
              }
              placeholder="e.g. Boston, MA..."
            />
            <button
              onClick={() =>
                addTag("preferred_locations", locationInput, setLocationInput)
              }
            >
              +
            </button>
          </div>
          <div className="prefs-tags">
            {prefs.preferred_locations.map((loc) => (
              <span key={loc} className="prefs-tag">
                {loc}
                <button onClick={() => removeTag("preferred_locations", loc)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Remote */}
        <div className="prefs-group prefs-row">
          <label className="prefs-label">Open to remote?</label>
          <button
            className={`prefs-toggle ${prefs.open_to_remote ? "on" : "off"}`}
            onClick={() =>
              setPrefs((p) => ({ ...p, open_to_remote: !p.open_to_remote }))
            }
          >
            <span className="toggle-thumb" />
          </button>
        </div>

        {/* Key Skills */}
        <div className="prefs-group">
          <label className="prefs-label">Key skills to highlight</label>
          <div className="prefs-tag-input">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                addTag("key_skills", skillInput, setSkillInput)
              }
              placeholder="e.g. Python, React, AWS..."
            />
            <button
              onClick={() => addTag("key_skills", skillInput, setSkillInput)}
            >
              +
            </button>
          </div>
          <div className="prefs-tags">
            {prefs.key_skills.map((skill) => (
              <span key={skill} className="prefs-tag">
                {skill}
                <button onClick={() => removeTag("key_skills", skill)}>
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="prefs-group">
          <label className="prefs-label">Additional notes</label>
          <textarea
            className="prefs-notes"
            value={prefs.notes}
            onChange={(e) => setPrefs((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Anything else the AI should know — visa status, availability, dream companies, etc."
            rows={3}
          />
        </div>

        {errorMsg && <div className="resume-error">{errorMsg}</div>}

        <button className="btn-save-resume" onClick={handleSave}>
          {status === "saving"
            ? "Saving..."
            : status === "saved"
              ? "✓ Saved"
              : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
