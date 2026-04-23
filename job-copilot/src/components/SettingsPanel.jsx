import { useState, useEffect } from 'react';

export default function SettingsPanel({ onBack }) {
  const [settings, setSettings] = useState({
    groqKey: '',
    geminiKey: '',
    openaiKey: '',
    backendUrl: 'http://localhost:8000',
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from chrome storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['settings'], (result) => {
        if (result.settings) {
          setSettings(result.settings);
        }
      });
    }
  }, []);

  const handleSave = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ settings }, () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const maskKey = (key) => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Settings</h2>
        <p className="panel-subtitle">Configure your AI providers and backend</p>
      </div>

      <div className="settings-form">
        <div className="settings-group">
          <label className="settings-label">
            <span className="label-text">Backend URL</span>
            <span className="label-hint">Your LangGraph server</span>
          </label>
          <input
            type="text"
            className="settings-input"
            value={settings.backendUrl}
            onChange={(e) => handleChange('backendUrl', e.target.value)}
            placeholder="http://localhost:8000"
          />
        </div>

        <div className="settings-divider" />

        <h3 className="settings-section-title">API Keys</h3>
        <p className="settings-section-hint">
          Keys are stored locally in your browser. Never shared externally.
        </p>

        <div className="settings-group">
          <label className="settings-label">
            <span className="label-text">Groq API Key</span>
            <span className="label-hint provider-free">Free tier</span>
          </label>
          <input
            type="password"
            className="settings-input"
            value={settings.groqKey}
            onChange={(e) => handleChange('groqKey', e.target.value)}
            placeholder="gsk_..."
          />
        </div>

        <div className="settings-group">
          <label className="settings-label">
            <span className="label-text">Gemini API Key</span>
            <span className="label-hint provider-free">Free tier</span>
          </label>
          <input
            type="password"
            className="settings-input"
            value={settings.geminiKey}
            onChange={(e) => handleChange('geminiKey', e.target.value)}
            placeholder="AIza..."
          />
        </div>

        <div className="settings-group">
          <label className="settings-label">
            <span className="label-text">OpenAI API Key</span>
            <span className="label-hint provider-paid">$5 budget</span>
          </label>
          <input
            type="password"
            className="settings-input"
            value={settings.openaiKey}
            onChange={(e) => handleChange('openaiKey', e.target.value)}
            placeholder="sk-..."
          />
        </div>

        <button className="btn-save" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
