import { useState, useEffect } from 'react';
import type { Game, GameData, Collection, Toast, Account } from '../types';
import { getTotalPlayTime, getLastPlayed } from '../types';

interface GameDetailProps {
  game: Game;
  gameData: GameData;
  collections: Collection[];
  accounts: Account[];
  isFavorite: boolean;
  onClose: () => void;
  onSaveGameData: (gameId: string, data: GameData) => void;
  onToggleFavorite: (gameId: string) => void;
  onLaunch: (game: Game) => void;
  onToast: (toast: Omit<Toast, 'id'>) => void;
}

function formatPlayTime(ms: number): string {
  if (ms < 60000) return 'Less than a minute';
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatSize(bytes?: number): string {
  if (!bytes) return 'Unknown';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function GameDetail({
  game, gameData, collections, accounts, isFavorite,
  onClose, onSaveGameData, onToggleFavorite, onLaunch, onToast,
}: GameDetailProps) {
  const [data, setData] = useState<GameData>({ ...gameData });
  const [newSavePath, setNewSavePath] = useState('');

  useEffect(() => {
    setData({ ...gameData });
  }, [gameData]);

  function save(updates: Partial<GameData>) {
    const updated = { ...data, ...updates };
    setData(updated);
    onSaveGameData(game.id, updated);
  }

  function addSaveLocation() {
    if (!newSavePath.trim()) return;
    save({ saveLocations: [...data.saveLocations, newSavePath.trim()] });
    setNewSavePath('');
  }

  function removeSaveLocation(index: number) {
    save({ saveLocations: data.saveLocations.filter((_, i) => i !== index) });
  }

  function toggleCollection(colId: string) {
    const has = data.collections.includes(colId);
    save({
      collections: has
        ? data.collections.filter(c => c !== colId)
        : [...data.collections, colId],
    });
  }

  async function handleBackup() {
    if (data.saveLocations.length === 0) {
      onToast({ message: 'No save locations configured.', type: 'error' });
      return;
    }
    const result = await window.api.backupSaves(game.id, data.saveLocations);
    onToast({ message: result.message, type: result.success ? 'success' : 'error' });
  }

  const coverUrl = data.customCoverUrl || game.coverUrl;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="game-detail" onClick={e => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.6">
            <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
          </svg>
        </button>

        <div className="detail-header">
          <div className="detail-cover">
            {coverUrl ? (
              <img src={coverUrl} alt={game.name} />
            ) : (
              <div className="card-placeholder">
                <span className="placeholder-letter">{game.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="detail-title-area">
            <h2 className="detail-name">{game.name}</h2>
            <span className={`source-badge ${game.source}`} style={{ position: 'static' }}>{game.source}</span>

            <div className="detail-stats">
              <div className="stat">
                <span className="stat-value">{formatPlayTime(getTotalPlayTime(data))}</span>
                <span className="stat-label">Total Play Time</span>
              </div>
              <div className="stat">
                <span className="stat-value">{formatDate(getLastPlayed(data))}</span>
                <span className="stat-label">Last Played</span>
              </div>
              <div className="stat">
                <span className="stat-value">{formatSize(game.sizeOnDisk)}</span>
                <span className="stat-label">Size</span>
              </div>
            </div>

            {/* Per-account playtime breakdown */}
            {data.accountPlayTime && Object.keys(data.accountPlayTime).length > 0 && accounts.length > 1 && (
              <div className="detail-account-playtime">
                {accounts.map(acct => {
                  const ap = data.accountPlayTime[acct.id];
                  if (!ap || ap.totalPlayTime === 0) return null;
                  return (
                    <div key={acct.id} className="account-playtime-row">
                      {acct.avatar ? (
                        <img src={acct.avatar} alt={acct.name} className="account-avatar-sm" />
                      ) : (
                        <span className="account-avatar-sm account-avatar-placeholder" style={{ background: acct.color }}>
                          {acct.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="account-playtime-name">{acct.name}</span>
                      <span className="account-playtime-time">{formatPlayTime(ap.totalPlayTime)}</span>
                      <span className="account-playtime-sessions">{ap.sessions.length} sessions</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="detail-actions">
              <button className="btn-primary" onClick={() => onLaunch(game)}>
                <svg width="10" height="12" viewBox="0 0 12 14" fill="currentColor"><path d="M0 0l12 7-12 7z"/></svg>
                Play
              </button>
              <button className={`btn-secondary ${isFavorite ? 'favorited' : ''}`} onClick={() => onToggleFavorite(game.id)}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill={isFavorite ? '#f59e0b' : 'none'} stroke={isFavorite ? '#f59e0b' : 'currentColor'} strokeWidth="1.2">
                  <path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.27 3.48 11.85l.67-3.93L1.3 5.14l3.94-.57z"/>
                </svg>
                {isFavorite ? 'Favorited' : 'Favorite'}
              </button>
            </div>
          </div>
        </div>

        <div className="detail-body">
          {/* Notes */}
          <div className="detail-section">
            <label className="detail-label">Notes</label>
            <textarea
              className="detail-textarea"
              value={data.notes}
              onChange={e => save({ notes: e.target.value })}
              placeholder="Add personal notes about this game..."
              rows={3}
            />
          </div>

          {/* Custom Cover URL */}
          <div className="detail-section">
            <label className="detail-label">Custom Cover URL</label>
            <input
              className="detail-input"
              value={data.customCoverUrl || ''}
              onChange={e => save({ customCoverUrl: e.target.value || null })}
              placeholder="https://example.com/cover.jpg"
            />
          </div>

          {/* Launch Settings */}
          <div className="detail-section">
            <label className="detail-label">Launch Arguments</label>
            <input
              className="detail-input"
              value={data.launchArgs}
              onChange={e => save({ launchArgs: e.target.value })}
              placeholder="-windowed -dx11"
            />
          </div>

          <div className="detail-row">
            <div className="detail-section" style={{ flex: 1 }}>
              <label className="detail-label">Pre-Launch Command</label>
              <input
                className="detail-input"
                value={data.preLaunchCmd}
                onChange={e => save({ preLaunchCmd: e.target.value })}
                placeholder="taskkill /IM discord.exe /F"
              />
            </div>
            <div className="detail-section" style={{ flex: 1 }}>
              <label className="detail-label">Post-Launch Command</label>
              <input
                className="detail-input"
                value={data.postLaunchCmd}
                onChange={e => save({ postLaunchCmd: e.target.value })}
                placeholder="start obs.exe"
              />
            </div>
          </div>

          {/* Collections */}
          {collections.length > 0 && (
            <div className="detail-section">
              <label className="detail-label">Collections</label>
              <div className="detail-collections">
                {collections.map(col => (
                  <button
                    key={col.id}
                    className={`collection-chip ${data.collections.includes(col.id) ? 'active' : ''}`}
                    onClick={() => toggleCollection(col.id)}
                    style={{ '--chip-color': col.color } as React.CSSProperties}
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Save Locations & Backup */}
          <div className="detail-section">
            <label className="detail-label">Save File Locations</label>
            {data.saveLocations.map((loc, i) => (
              <div key={i} className="save-location-row">
                <span className="save-location-path">{loc}</span>
                <button className="save-location-remove" onClick={() => removeSaveLocation(i)}>
                  <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.4">
                    <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
                  </svg>
                </button>
              </div>
            ))}
            <div className="save-location-add">
              <input
                className="detail-input"
                value={newSavePath}
                onChange={e => setNewSavePath(e.target.value)}
                placeholder="C:\Users\...\AppData\..."
                onKeyDown={e => e.key === 'Enter' && addSaveLocation()}
              />
              <button className="btn-secondary" onClick={addSaveLocation}>Add</button>
            </div>
            {data.saveLocations.length > 0 && (
              <button className="btn-secondary" onClick={handleBackup} style={{ marginTop: 8 }}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M7 1v9M4 7l3 3 3-3M2 12h10"/>
                </svg>
                Backup Saves
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
