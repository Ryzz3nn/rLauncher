import { useState } from 'react';
import type { Game, GameData, ViewMode } from '../types';

interface GameCardProps {
  game: Game;
  gameData?: GameData;
  isFavorite: boolean;
  isRunning: boolean;
  variant: ViewMode;
  onLaunch: (game: Game) => void;
  onContextMenu: (e: React.MouseEvent, game: Game) => void;
  onShowDetail: (game: Game) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  steam: 'Steam',
  epic: 'Epic',
  ea: 'EA',
  gog: 'GOG',
  custom: 'Custom',
};

function formatPlayTime(ms: number): string {
  if (!ms) return '';
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function GameCard({ game, gameData, isFavorite, isRunning, variant, onLaunch, onContextMenu, onShowDetail }: GameCardProps) {
  const [imgError, setImgError] = useState(false);
  const coverUrl = gameData?.customCoverUrl || game.coverUrl;

  if (variant === 'list') {
    return (
      <div className={`game-list-item ${isRunning ? 'running' : ''}`}
        onClick={() => onShowDetail(game)}
        onContextMenu={e => onContextMenu(e, game)}
      >
        <div className="list-item-image">
          {coverUrl && !imgError ? (
            <img src={coverUrl} alt={game.name} onError={() => setImgError(true)} loading="lazy" />
          ) : (
            <div className="card-placeholder"><span className="placeholder-letter" style={{ fontSize: 18 }}>{game.name.charAt(0).toUpperCase()}</span></div>
          )}
          {isRunning && <span className="running-dot" />}
        </div>
        <div className="list-item-info">
          <span className="list-item-name">
            {isFavorite && <svg width="12" height="12" viewBox="0 0 14 14" fill="#f59e0b" style={{ marginRight: 6, flexShrink: 0 }}><path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.27 3.48 11.85l.67-3.93L1.3 5.14l3.94-.57z"/></svg>}
            {game.name}
          </span>
          <span className="list-item-meta">
            <span className={`list-source-badge ${game.source}`}>{SOURCE_LABELS[game.source] ?? game.source}</span>
            {gameData && gameData.totalPlayTime > 0 && <span className="list-item-playtime">{formatPlayTime(gameData.totalPlayTime)}</span>}
            {game.sizeOnDisk ? <span className="list-item-size">{formatSize(game.sizeOnDisk)}</span> : null}
          </span>
        </div>
        <button className="list-play-btn" onClick={e => { e.stopPropagation(); onLaunch(game); }}>
          <svg width="10" height="12" viewBox="0 0 12 14" fill="currentColor"><path d="M0 0l12 7-12 7z"/></svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`game-card ${isRunning ? 'running' : ''}`}
      onClick={() => onShowDetail(game)}
      onContextMenu={e => onContextMenu(e, game)}
    >
      <div className="card-image">
        {coverUrl && !imgError ? (
          <img src={coverUrl} alt={game.name} onError={() => setImgError(true)} loading="lazy" />
        ) : (
          <div className="card-placeholder"><span className="placeholder-letter">{game.name.charAt(0).toUpperCase()}</span></div>
        )}
        <div className="card-name-overlay">
          <span className="card-name" title={game.name}>{game.name}</span>
        </div>
        <div className="card-overlay">
          <button className="play-btn" onClick={e => { e.stopPropagation(); onLaunch(game); }}>
            <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><path d="M0 0l12 7-12 7z"/></svg>
            Play
          </button>
        </div>
        <span className={`source-badge ${game.source}`}>{SOURCE_LABELS[game.source] ?? game.source}</span>
        {isFavorite && (
          <span className="favorite-badge">
            <svg width="10" height="10" viewBox="0 0 14 14" fill="#f59e0b"><path d="M7 1l1.76 3.57 3.94.57-2.85 2.78.67 3.93L7 10.27 3.48 11.85l.67-3.93L1.3 5.14l3.94-.57z"/></svg>
          </span>
        )}
        {isRunning && <span className="running-indicator">Running</span>}
      </div>
    </div>
  );
}
