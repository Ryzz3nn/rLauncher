import type { AppSettings, Collection, Toast, Account } from '../types';
import { useState, useEffect } from 'react';

interface SettingsPageProps {
  settings: AppSettings;
  accounts: Account[];
  onSaveAccounts: (accounts: Account[]) => void;
  onImportSteamAccounts: () => Promise<void>;
  collections: Collection[];
  onSaveSettings: (settings: AppSettings) => void;
  onSaveCollections: (collections: Collection[]) => void;
  onToast: (toast: Omit<Toast, 'id'>) => void;
}

const ACCENT_COLORS = [
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Green', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Pink', value: '#ec4899' },
];

const COLLECTION_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#7c3aed', '#ec4899'];

export function SettingsPage({ settings, accounts, collections, onSaveSettings, onSaveAccounts, onImportSteamAccounts, onSaveCollections, onToast }: SettingsPageProps) {
  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState(COLLECTION_COLORS[0]);
  const [newAcctName, setNewAcctName] = useState('');
  const [newAcctAvatar, setNewAcctAvatar] = useState('');
  const [newAcctColor, setNewAcctColor] = useState(COLLECTION_COLORS[4]);
  const [updateStatus, setUpdateStatus] = useState<{ status: string; version?: string; percent?: number; message?: string }>({ status: 'idle' });
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    window.api.getAppVersion().then(setAppVersion);
    const unsub = window.api.onUpdateStatus(setUpdateStatus);
    return unsub;
  }, []);

  function update(key: keyof AppSettings, value: any) {
    const updated = { ...settings, [key]: value };
    onSaveSettings(updated);
    if (key === 'startWithWindows') {
      window.api.setStartWithWindows(value);
    }
  }

  function addCollection() {
    if (!newColName.trim()) return;
    const col: Collection = {
      id: `col-${Date.now()}`,
      name: newColName.trim(),
      color: newColColor,
    };
    onSaveCollections([...collections, col]);
    setNewColName('');
  }

  function removeCollection(id: string) {
    onSaveCollections(collections.filter(c => c.id !== id));
  }

  async function handleExport() {
    const result = await window.api.exportData();
    onToast({
      message: result.success ? 'Data exported successfully.' : 'Export cancelled.',
      type: result.success ? 'success' : 'info',
    });
  }

  async function handleImport() {
    const result = await window.api.importData();
    onToast({
      message: result.success ? 'Data imported. Restart to apply.' : 'Import cancelled.',
      type: result.success ? 'success' : 'info',
    });
    if (result.success) {
      setTimeout(() => window.location.reload(), 1000);
    }
  }

  return (
    <div className="settings-page">
      <h2 className="settings-title">Settings</h2>

      {/* Updates */}
      <div className="settings-group">
        <h3 className="settings-group-title">Updates</h3>
        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">rLauncher v{appVersion || '...'}</span>
            <span className="setting-desc">
              {updateStatus.status === 'checking' && 'Checking for updates...'}
              {updateStatus.status === 'up-to-date' && 'You are up to date.'}
              {updateStatus.status === 'available' && `Update v${updateStatus.version} available.`}
              {updateStatus.status === 'downloading' && `Downloading... ${updateStatus.percent || 0}%`}
              {updateStatus.status === 'ready' && 'Update downloaded. Restart to apply.'}
              {updateStatus.status === 'error' && `Update error: ${updateStatus.message}`}
              {updateStatus.status === 'idle' && 'Check for new versions.'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(updateStatus.status === 'idle' || updateStatus.status === 'up-to-date' || updateStatus.status === 'error') && (
              <button className="btn-secondary" onClick={() => window.api.checkForUpdates()}>Check</button>
            )}
            {updateStatus.status === 'available' && (
              <button className="btn-primary" onClick={() => window.api.downloadUpdate()}>Download</button>
            )}
            {updateStatus.status === 'downloading' && (
              <div className="update-progress">
                <div className="update-progress-bar" style={{ width: `${updateStatus.percent || 0}%` }} />
              </div>
            )}
            {updateStatus.status === 'ready' && (
              <button className="btn-primary" onClick={() => window.api.installUpdate()}>Restart & Update</button>
            )}
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-group">
        <h3 className="settings-group-title">Appearance</h3>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Accent Color</span>
          </div>
          <div className="color-picker">
            {ACCENT_COLORS.map(c => (
              <button
                key={c.value}
                className={`color-swatch ${settings.accentColor === c.value ? 'active' : ''}`}
                style={{ background: c.value }}
                onClick={() => update('accentColor', c.value)}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Card Size</span>
          </div>
          <select
            className="setting-select"
            value={settings.cardSize}
            onChange={e => update('cardSize', e.target.value)}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>

      {/* Behavior */}
      <div className="settings-group">
        <h3 className="settings-group-title">Behavior</h3>

        <label className="setting-row clickable">
          <div className="setting-info">
            <span className="setting-name">Start with Windows</span>
            <span className="setting-desc">Launch rLauncher when you log in</span>
          </div>
          <input type="checkbox" className="setting-toggle" checked={settings.startWithWindows} onChange={e => update('startWithWindows', e.target.checked)} />
        </label>

        <label className="setting-row clickable">
          <div className="setting-info">
            <span className="setting-name">Minimize to Tray</span>
            <span className="setting-desc">Hide to system tray when minimized</span>
          </div>
          <input type="checkbox" className="setting-toggle" checked={settings.minimizeToTray} onChange={e => update('minimizeToTray', e.target.checked)} />
        </label>

        <label className="setting-row clickable">
          <div className="setting-info">
            <span className="setting-name">Close to Tray</span>
            <span className="setting-desc">Keep running in the background when closed</span>
          </div>
          <input type="checkbox" className="setting-toggle" checked={settings.closeToTray} onChange={e => update('closeToTray', e.target.checked)} />
        </label>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Global Hotkey</span>
            <span className="setting-desc">Show/hide rLauncher from anywhere</span>
          </div>
          <input
            className="setting-input"
            value={settings.globalHotkey}
            onChange={e => update('globalHotkey', e.target.value)}
            placeholder="CommandOrControl+Shift+G"
          />
        </div>
      </div>

      {/* Accounts */}
      <div className="settings-group">
        <h3 className="settings-group-title">Accounts</h3>

        <div className="accounts-list">
          {accounts.map(acct => (
            <div key={acct.id} className="account-row">
              {acct.avatar ? (
                <img src={acct.avatar} alt={acct.name} className="account-avatar-tiny" />
              ) : (
                <span className="account-avatar-tiny account-avatar-placeholder" style={{ background: acct.color }}>
                  {acct.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="account-row-name">{acct.name}</span>
              {settings.activeAccountId === acct.id && <span className="active-badge">Active</span>}
              <input className="account-steamid-input" value={acct.steamId || ''} placeholder="Steam ID"
                onChange={e => { const updated = accounts.map(a => a.id === acct.id ? { ...a, steamId: e.target.value } : a); onSaveAccounts(updated); }}
                onClick={e => e.stopPropagation()} />
              <span style={{ flex: 1 }} />
              {settings.activeAccountId !== acct.id && (
                <button className="account-action-btn" onClick={() => update('activeAccountId', acct.id)}>Set Active</button>
              )}
              {acct.id !== 'default' && (
                <button className="account-action-btn danger" onClick={() => onSaveAccounts(accounts.filter(a => a.id !== acct.id))}>Remove</button>
              )}
            </div>
          ))}
        </div>

        <div className="account-actions-row">
          <button className="btn-secondary" onClick={onImportSteamAccounts} style={{ fontSize: 12, padding: '5px 12px' }}>
            Import from Steam
          </button>
          <span style={{ flex: 1 }} />
          <input className="setting-input" value={newAcctName} onChange={e => setNewAcctName(e.target.value)}
            placeholder="Name" style={{ width: 100 }}
            onKeyDown={e => { if (e.key === 'Enter' && newAcctName.trim()) { onSaveAccounts([...accounts, { id: `acct-${Date.now()}`, name: newAcctName.trim(), avatar: newAcctAvatar.trim(), color: newAcctColor }]); setNewAcctName(''); setNewAcctAvatar(''); } }} />
          <input className="setting-input" value={newAcctAvatar} onChange={e => setNewAcctAvatar(e.target.value)}
            placeholder="Avatar URL" style={{ width: 120 }} />
          <button className="btn-primary" style={{ padding: '5px 12px', fontSize: 12 }}
            onClick={() => { if (!newAcctName.trim()) return; onSaveAccounts([...accounts, { id: `acct-${Date.now()}`, name: newAcctName.trim(), avatar: newAcctAvatar.trim(), color: newAcctColor }]); setNewAcctName(''); setNewAcctAvatar(''); }}>Add</button>
        </div>
      </div>

      {/* Collections */}
      <div className="settings-group">
        <h3 className="settings-group-title">Collections</h3>

        {collections.map(col => (
          <div key={col.id} className="setting-row">
            <div className="setting-info" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="color-dot" style={{ background: col.color }} />
              <span className="setting-name">{col.name}</span>
            </div>
            <button className="setting-remove-btn" onClick={() => removeCollection(col.id)}>Remove</button>
          </div>
        ))}

        <div className="collection-add-row">
          <div className="color-picker-small">
            {COLLECTION_COLORS.map(c => (
              <button
                key={c}
                className={`color-swatch-sm ${newColColor === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setNewColColor(c)}
              />
            ))}
          </div>
          <input
            className="setting-input"
            value={newColName}
            onChange={e => setNewColName(e.target.value)}
            placeholder="Collection name"
            onKeyDown={e => e.key === 'Enter' && addCollection()}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={addCollection} style={{ padding: '6px 14px', fontSize: 12 }}>Add</button>
        </div>
      </div>

      {/* Steam Integration */}
      <div className="settings-group">
        <h3 className="settings-group-title">Steam Integration</h3>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Steam API Key</span>
            <span className="setting-desc">Get one free at store.steampowered.com/dev/apikey</span>
          </div>
          <input
            className="setting-input"
            type="password"
            value={settings.steamApiKey}
            onChange={e => update('steamApiKey', e.target.value)}
            placeholder="Your Steam API key"
          />
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Steam ID</span>
            <span className="setting-desc">Your 17-digit Steam ID (auto-detected if left empty)</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="setting-input"
              value={settings.steamId}
              onChange={e => update('steamId', e.target.value)}
              placeholder="76561198..."
              style={{ width: 160 }}
            />
            <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={async () => {
              const id = await window.api.detectSteamId();
              if (id) { update('steamId', id); onToast({ message: `Detected Steam ID: ${id}`, type: 'success' }); }
              else onToast({ message: 'Could not detect Steam ID.', type: 'error' });
            }}>Detect</button>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Import Steam Playtime</span>
            <span className="setting-desc">Sync play time for all accounts with a Steam ID</span>
          </div>
          <button className="btn-secondary" onClick={async () => {
            if (!settings.steamApiKey) { onToast({ message: 'Set your Steam API key first.', type: 'error' }); return; }

            // Collect all accounts that have a steamId
            const acctsWith = accounts.filter(a => a.steamId);
            // Also include the global steamId as fallback
            if (acctsWith.length === 0 && settings.steamId) {
              onToast({ message: 'Fetching Steam playtime...', type: 'info' });
              const playtime = await window.api.fetchSteamPlaytime(settings.steamId);
              const count = Object.keys(playtime).length;
              if (count > 0) {
                window.dispatchEvent(new CustomEvent('steam-playtime', { detail: { playtime, accountId: settings.activeAccountId } }));
                onToast({ message: `Imported playtime for ${count} games.`, type: 'success' });
              } else {
                onToast({ message: 'No playtime data found.', type: 'error' });
              }
              return;
            }

            if (acctsWith.length === 0) { onToast({ message: 'No accounts have a Steam ID set.', type: 'error' }); return; }

            onToast({ message: `Syncing playtime for ${acctsWith.length} account(s)...`, type: 'info' });
            let totalGames = 0;
            for (const acct of acctsWith) {
              const playtime = await window.api.fetchSteamPlaytime(acct.steamId!);
              const count = Object.keys(playtime).length;
              if (count > 0) {
                window.dispatchEvent(new CustomEvent('steam-playtime', { detail: { playtime, accountId: acct.id } }));
                totalGames += count;
              }
            }
            onToast({ message: totalGames > 0 ? `Synced playtime across ${acctsWith.length} account(s).` : 'No playtime data found.', type: totalGames > 0 ? 'success' : 'error' });
          }}>Sync All</button>
        </div>
      </div>

      {/* Data */}
      <div className="settings-group">
        <h3 className="settings-group-title">Data</h3>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Export Data</span>
            <span className="setting-desc">Save all settings, favorites, and game data</span>
          </div>
          <button className="btn-secondary" onClick={handleExport}>Export</button>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Import Data</span>
            <span className="setting-desc">Restore from a previous export</span>
          </div>
          <button className="btn-secondary" onClick={handleImport}>Import</button>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <span className="setting-name">Logs</span>
            <span className="setting-desc">Open the log file location for troubleshooting</span>
          </div>
          <button className="btn-secondary" onClick={() => window.api.openLogsFolder()}>Open Logs</button>
        </div>
      </div>
    </div>
  );
}
