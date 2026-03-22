import { useState, useEffect } from 'react';

interface TitleBarProps {
  onGoToSettings: () => void;
}

export function TitleBar({ onGoToSettings }: TitleBarProps) {
  const [pinned, setPinned] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('idle');
  const [updateVersion, setUpdateVersion] = useState<string>('');

  useEffect(() => {
    window.api.getAlwaysOnTop().then(setPinned);
    const unsub = window.api.onUpdateStatus((status) => {
      setUpdateStatus(status.status);
      if (status.version) setUpdateVersion(status.version);
    });
    return unsub;
  }, []);

  async function togglePin() {
    const result = await window.api.toggleAlwaysOnTop();
    setPinned(result);
  }

  const showBadge = updateStatus === 'available' || updateStatus === 'ready';

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="titlebar-title">rLauncher</span>
        {showBadge && (
          <button className="update-badge" onClick={onGoToSettings}>
            {updateStatus === 'ready' ? 'Restart to update' : `v${updateVersion} available`}
          </button>
        )}
      </div>
      <div className="titlebar-controls">
        <button
          onClick={togglePin}
          aria-label="Always on top"
          className={`pin-btn ${pinned ? 'pinned' : ''}`}
          title={pinned ? 'Unpin from top' : 'Pin on top'}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M4.5 2.5L11.5 2.5L11.5 7L9.5 9L10.5 13.5L8 11L5.5 13.5L6.5 9L4.5 7Z"/>
            {pinned && <line x1="8" y1="11" x2="8" y2="15" strokeWidth="1.4"/>}
          </svg>
        </button>
        <button onClick={() => window.api.windowMinimize()} aria-label="Minimize">
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
        </button>
        <button onClick={() => window.api.windowMaximize()} aria-label="Maximize">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="0.5" y="0.5" width="9" height="9"/>
          </svg>
        </button>
        <button className="close" onClick={() => window.api.windowClose()} aria-label="Close">
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
            <line x1="0" y1="0" x2="10" y2="10"/><line x1="10" y1="0" x2="0" y2="10"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
