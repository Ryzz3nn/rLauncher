import type { Game, GameData, GameSection, ViewMode } from '../types';
import { GameCard } from './GameCard';

interface GameGridProps {
  sections: GameSection[];
  loading: boolean;
  favorites: Set<string>;
  runningGames: Set<string>;
  gameDataMap: Record<string, GameData>;
  viewMode: ViewMode;
  onLaunch: (game: Game) => void;
  onContextMenu: (e: React.MouseEvent, game: Game) => void;
  onShowDetail: (game: Game) => void;
}

export function GameGrid({ sections, loading, favorites, runningGames, gameDataMap, viewMode, onLaunch, onContextMenu, onShowDetail }: GameGridProps) {
  if (loading) {
    return (
      <div className="state-message">
        <div className="spinner" />
        <p>Scanning libraries...</p>
      </div>
    );
  }

  const totalGames = sections.reduce((sum, s) => sum + s.games.length, 0);

  if (totalGames === 0) {
    return (
      <div className="state-message">
        <p>No games found</p>
        <p className="hint">Connect a library or add a custom game to get started.</p>
      </div>
    );
  }

  const showHeaders = sections.length > 1 || (sections.length === 1 && sections[0].label);

  return (
    <div className="game-sections">
      {sections.map(section => (
        <div key={section.label || '_all'} className="game-section">
          {showHeaders && section.label && (
            <div className="section-header">
              <span className="section-label">{section.label}</span>
              <span className="section-count">{section.games.length}</span>
              <div className="section-line" />
            </div>
          )}
          <div className={viewMode === 'list' ? 'game-list' : 'game-grid'}>
            {section.games.map(game => (
              <GameCard
                key={game.id}
                game={game}
                gameData={gameDataMap[game.id]}
                isFavorite={favorites.has(game.id)}
                isRunning={runningGames.has(game.id)}
                variant={viewMode}
                onLaunch={onLaunch}
                onContextMenu={onContextMenu}
                onShowDetail={onShowDetail}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
