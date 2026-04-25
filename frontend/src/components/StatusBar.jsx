const PLATFORM_LABELS = {
  linkedin: 'LinkedIn',
  nuworks: 'NUworks',
  jobright: 'Jobright',
  unsupported: 'Unsupported page',
  demo: 'Demo mode',
};

export default function StatusBar({ platform }) {
  const isConnected = platform && platform !== 'unsupported';

  return (
    <footer className="status-bar">
      <div className="status-indicator">
        <span
          className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}
        />
        <span className="status-text">
          {isConnected
            ? `Connected to ${PLATFORM_LABELS[platform]}`
            : PLATFORM_LABELS[platform] || 'Detecting...'}
        </span>
      </div>
    </footer>
  );
}
