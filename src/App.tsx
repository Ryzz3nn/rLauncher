import { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { GameGrid } from './components/GameGrid';
import { TitleBar } from './components/TitleBar';
import { ContextMenu } from './components/ContextMenu';
import { GameDetail } from './components/GameDetail';
import { SettingsPage } from './components/SettingsPage';
import { ToastContainer } from './components/Toast';
import type { Game, GameFilter, GameSection, GameData, StoreData, AppSettings, Collection, SortMode, ViewMode, AppPage, Toast, Account, AccountPlayData } from './types';
import { getTotalPlayTime, getLastPlayed } from './types';

const DEFAULT_GAME_DATA: GameData = {
  accountPlayTime: {},
  totalPlayTime: 0, lastPlayed: null, sessions: [],
  launchArgs: '', preLaunchCmd: '', postLaunchCmd: '',
  customCoverUrl: null, notes: '', saveLocations: [], collections: [],
};

const DEFAULT_SETTINGS: AppSettings = {
  startWithWindows: false, minimizeToTray: false, closeToTray: false,
  globalHotkey: 'CommandOrControl+Shift+G', theme: 'neutral', accentColor: '#7c3aed', cardSize: 'medium',
  steamApiKey: '', steamId: '', activeAccountId: 'default',
};

const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'default', name: 'Default', avatar: '', color: '#7c3aed' },
];

export default function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [filter, setFilter] = useState<GameFilter>({ source: 'all', search: '' });
  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<StoreData>({
    settings: DEFAULT_SETTINGS, gameData: {}, collections: [], favorites: [], customGames: [],
    accounts: DEFAULT_ACCOUNTS,
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; game: Game } | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('favorites-first');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState<AppPage>('library');
  const [detailGame, setDetailGame] = useState<Game | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [updateStatus, setUpdateStatus] = useState<{ status: string; version?: string; percent?: number; message?: string }>({ status: 'idle' });
  const [runningGames, setRunningGames] = useState<Set<string>>(new Set());

  const favorites = useMemo(() => new Set(storeData.favorites), [storeData.favorites]);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const toast = { ...t, id: `t-${Date.now()}-${Math.random()}` };
    setToasts(prev => [...prev, toast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Load store and games on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await window.api.getStoreData();
        setStoreData(data);
      } catch { /* first run */ }
      await scanAllLibraries();
    })();
  }, []);

  // Listen for update status globally
  useEffect(() => {
    return window.api.onUpdateStatus(setUpdateStatus);
  }, []);

  // Poll running games
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const ids = await window.api.getRunningGames();
        setRunningGames(new Set(ids));
      } catch { /* ignore */ }
    }, 30000); // poll every 30s instead of 10s
    return () => clearInterval(interval);
  }, []);

  // Listen for game stopped events
  useEffect(() => {
    const unsub = window.api.onGameStopped((gameId, duration) => {
      if (duration <= 0) return; // force-kill with no playtime
      setStoreData(prev => {
        const gd = prev.gameData[gameId] || { ...DEFAULT_GAME_DATA };
        const activeId = prev.settings.activeAccountId || 'default';
        const session = { start: new Date(Date.now() - duration).toISOString(), end: new Date().toISOString(), duration };
        const now = new Date().toISOString();

        // Update per-account playtime
        const acctData = gd.accountPlayTime?.[activeId] || { totalPlayTime: 0, lastPlayed: null, sessions: [] };
        const updatedAcctPlayTime = {
          ...gd.accountPlayTime,
          [activeId]: {
            totalPlayTime: acctData.totalPlayTime + duration,
            lastPlayed: now,
            sessions: [...acctData.sessions, session],
          },
        };

        const updated: StoreData = {
          ...prev,
          gameData: {
            ...prev.gameData,
            [gameId]: {
              ...gd,
              accountPlayTime: updatedAcctPlayTime,
              // Keep legacy totals in sync (sum of all accounts)
              totalPlayTime: Object.values(updatedAcctPlayTime).reduce((s, a) => s + a.totalPlayTime, 0),
              lastPlayed: now,
              sessions: [...(gd.sessions || []), session],
            },
          },
        };
        window.api.saveStoreData(updated);
        return updated;
      });
      setRunningGames(prev => { const next = new Set(prev); next.delete(gameId); return next; });
      const game = games.find(g => g.id === gameId);
      const mins = Math.round(duration / 60000);
      addToast({ message: `${game?.name || 'Game'} — played for ${mins}m`, type: 'info' });
    });
    return unsub;
  }, [games, addToast]);

  // Listen for Steam playtime import (per-account)
  useEffect(() => {
    function handleSteamPlaytime(e: Event) {
      const { playtime, accountId } = (e as CustomEvent).detail as { playtime: Record<string, number>; accountId: string };
      setStoreData(prev => {
        const updatedGameData = { ...prev.gameData };
        for (const [appId, timeMs] of Object.entries(playtime)) {
          const gameId = `steam-${appId}`;
          const existing = updatedGameData[gameId] || { ...DEFAULT_GAME_DATA };
          const acctPlayTime = { ...(existing.accountPlayTime || {}) };
          const acctData = acctPlayTime[accountId] || { totalPlayTime: 0, lastPlayed: null, sessions: [] };

          // Use Steam's playtime if it's higher than local tracking for this account
          if (timeMs > acctData.totalPlayTime) {
            acctPlayTime[accountId] = { ...acctData, totalPlayTime: timeMs };
          }

          const newTotal = Object.values(acctPlayTime).reduce((s, a) => s + a.totalPlayTime, 0);
          updatedGameData[gameId] = { ...existing, accountPlayTime: acctPlayTime, totalPlayTime: newTotal };
        }
        const updated = { ...prev, gameData: updatedGameData };
        window.api.saveStoreData(updated);
        return updated;
      });
    }
    window.addEventListener('steam-playtime', handleSteamPlaytime);
    return () => window.removeEventListener('steam-playtime', handleSteamPlaytime);
  }, []);

  // Apply theme and accent color
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', storeData.settings.theme || 'neutral');
    document.documentElement.style.setProperty('--accent', storeData.settings.accentColor);
  }, [storeData.settings.accentColor, storeData.settings.theme]);

  async function scanAllLibraries() {
    setLoading(true);
    try {
      const [steamGames, epicGames, gogGames, eaGames] = await Promise.all([
        window.api.getSteamGames().catch(() => []),
        window.api.getEpicGames().catch(() => []),
        window.api.getGogGames().catch(() => []),
        window.api.getEaGames().catch(() => []),
      ]);

      const mapped: Game[] = [
        ...steamGames.map((g: any) => ({
          id: `steam-${g.appId}`, appId: g.appId, name: g.name, source: 'steam' as const,
          installDir: g.installDir, sizeOnDisk: g.sizeOnDisk,
          coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appId}/library_600x900.jpg`,
        })),
        ...epicGames.map((g: any) => ({
          id: `epic-${g.appId}`, appId: g.appId, name: g.name, source: 'epic' as const,
          installDir: g.installDir, sizeOnDisk: g.sizeOnDisk,
          executablePath: g.executablePath,
          coverUrl: undefined, // Epic doesn't have easy public cover URLs
        })),
        ...gogGames.map((g: any) => ({
          id: `gog-${g.appId}`, appId: g.appId, name: g.name, source: 'gog' as const,
          installDir: g.installDir, sizeOnDisk: g.sizeOnDisk,
          executablePath: g.executablePath,
        })),
        ...eaGames.map((g: any) => ({
          id: `ea-${g.appId}`, appId: g.appId, name: g.name, source: 'ea' as const,
          installDir: g.installDir, sizeOnDisk: g.sizeOnDisk,
          executablePath: g.executablePath,
        })),
      ];

      setGames([...mapped, ...storeData.customGames]);
    } catch (err) {
      console.error('Failed to load games:', err);
    }
    setLoading(false);
  }

  function saveStore(updated: StoreData) {
    setStoreData(updated);
    window.api.saveStoreData(updated);
  }

  function toggleFavorite(gameId: string) {
    const favs = [...storeData.favorites];
    const idx = favs.indexOf(gameId);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(gameId);
    saveStore({ ...storeData, favorites: favs });
  }

  function getGameData(gameId: string): GameData {
    return storeData.gameData[gameId] || { ...DEFAULT_GAME_DATA };
  }

  function saveGameData(gameId: string, data: GameData) {
    saveStore({ ...storeData, gameData: { ...storeData.gameData, [gameId]: data } });
  }

  function toggleGameCollection(gameId: string, colId: string) {
    const gd = getGameData(gameId);
    const has = gd.collections.includes(colId);
    saveGameData(gameId, {
      ...gd,
      collections: has ? gd.collections.filter(c => c !== colId) : [...gd.collections, colId],
    });
  }

  // Filtering
  const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
  const recentCutoff = Date.now() - TWO_WEEKS;

  const sections = useMemo((): GameSection[] => {
    let filtered = games.filter(game => {
      if (filter.collectionId) {
        const gd = storeData.gameData[game.id];
        return gd?.collections?.includes(filter.collectionId);
      }
      if (filter.source === 'favorites') return favorites.has(game.id);
      if (filter.source === 'recent') {
        const gd = storeData.gameData[game.id];
        return gd?.lastPlayed && new Date(gd.lastPlayed).getTime() > recentCutoff;
      }
      if (filter.source !== 'all' && game.source !== filter.source) return false;
      return true;
    });

    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(g => g.name.toLowerCase().includes(q));
    }

    const sortAlpha = (a: Game, b: Game) => a.name.localeCompare(b.name);

    switch (sortMode) {
      case 'favorites-first': {
        const favs = filtered.filter(g => favorites.has(g.id)).sort(sortAlpha);
        const rest = filtered.filter(g => !favorites.has(g.id)).sort(sortAlpha);
        const result: GameSection[] = [];
        if (favs.length > 0) result.push({ label: 'Favorites', games: favs });
        if (rest.length > 0) result.push({ label: 'All Games', games: rest });
        return result;
      }
      case 'a-z':
        return [{ label: '', games: [...filtered].sort(sortAlpha) }];
      case 'z-a':
        return [{ label: '', games: [...filtered].sort((a, b) => b.name.localeCompare(a.name)) }];
      case 'size':
        return [{ label: '', games: [...filtered].sort((a, b) => (b.sizeOnDisk ?? 0) - (a.sizeOnDisk ?? 0)) }];
      case 'recent':
        return [{ label: '', games: [...filtered].sort((a, b) => {
          const aLp = getLastPlayed(storeData.gameData[a.id]);
          const bLp = getLastPlayed(storeData.gameData[b.id]);
          const aTime = aLp ? new Date(aLp).getTime() : 0;
          const bTime = bLp ? new Date(bLp).getTime() : 0;
          return bTime - aTime;
        }) }];
      case 'play-time':
        return [{ label: '', games: [...filtered].sort((a, b) => {
          return getTotalPlayTime(storeData.gameData[b.id]) - getTotalPlayTime(storeData.gameData[a.id]);
        }) }];
    }
  }, [games, filter, favorites, sortMode, storeData.gameData, storeData.collections]);

  const totalCount = sections.reduce((sum, s) => sum + s.games.length, 0);

  const counts = {
    all: games.length,
    steam: games.filter(g => g.source === 'steam').length,
    epic: games.filter(g => g.source === 'epic').length,
    gog: games.filter(g => g.source === 'gog').length,
    ea: games.filter(g => g.source === 'ea').length,
    custom: games.filter(g => g.source === 'custom').length,
    favorites: storeData.favorites.length,
    recent: games.filter(g => {
      const lp = getLastPlayed(storeData.gameData[g.id]);
      return lp && new Date(lp).getTime() > recentCutoff;
    }).length,
  };

  function handleLaunch(game: Game) {
    const gd = getGameData(game.id);
    window.api.launchGame({
      source: game.source, appId: game.appId, executablePath: game.executablePath,
      id: game.id, launchArgs: gd.launchArgs, preLaunchCmd: gd.preLaunchCmd, postLaunchCmd: gd.postLaunchCmd,
    });
    addToast({ message: `Launching ${game.name}...`, type: 'info' });
  }

  function handleContextMenu(e: React.MouseEvent, game: Game) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, game });
  }

  function handleAddCustomGame(game: Game) {
    const updated = [...games, game];
    setGames(updated);
    const customOnly = [...storeData.customGames, game];
    saveStore({ ...storeData, customGames: customOnly });
  }

  const ACCT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#7c3aed', '#ec4899'];

  async function handleImportSteamAccounts() {
    addToast({ message: 'Detecting Steam accounts...', type: 'info' });
    const localAccounts = await window.api.getSteamAccounts();
    if (localAccounts.length === 0) {
      addToast({ message: 'No Steam accounts found on this machine.', type: 'error' });
      return;
    }

    let profiles: { steamId: string; personaName: string; avatarUrl: string }[] = [];
    if (storeData.settings.steamApiKey) {
      profiles = await window.api.fetchSteamProfiles(localAccounts.map(a => a.steamId));
    }

    const profileMap = new Map(profiles.map(p => [p.steamId, p]));
    const currentAccounts = storeData.accounts || DEFAULT_ACCOUNTS;
    const updated = [...currentAccounts];
    let added = 0;

    for (let i = 0; i < localAccounts.length; i++) {
      const local = localAccounts[i];
      if (updated.some(a => a.steamId === local.steamId)) continue;

      const profile = profileMap.get(local.steamId);
      updated.push({
        id: `steam-${local.steamId}`,
        name: profile?.personaName || local.personaName || local.accountName,
        avatar: profile?.avatarUrl || '',
        color: ACCT_COLORS[i % ACCT_COLORS.length],
        steamId: local.steamId,
      });
      added++;
    }

    if (added === 0) {
      addToast({ message: 'All Steam accounts already imported.', type: 'info' });
      return;
    }

    // Remove default account if we have real ones now
    const finalAccounts = updated.filter(a => a.id !== 'default');
    const accounts = finalAccounts.length > 0 ? finalAccounts : updated;

    // Find the most recent Steam account
    const mostRecent = localAccounts.find(a => a.mostRecent);
    const newActiveId = mostRecent ? `steam-${mostRecent.steamId}` : storeData.settings.activeAccountId;
    const newSteamId = mostRecent?.steamId || storeData.settings.steamId;

    // Single atomic save with everything
    saveStore({
      ...storeData,
      accounts,
      settings: {
        ...storeData.settings,
        activeAccountId: accounts.some(a => a.id === newActiveId) ? newActiveId : accounts[0]?.id || 'default',
        steamId: newSteamId || storeData.settings.steamId,
      },
    });

    addToast({ message: `Imported ${added} Steam account(s).`, type: 'success' });
  }

  function handleUninstall(game: Game) {
    if (game.source === 'custom') {
      const updated = games.filter(g => g.id !== game.id);
      setGames(updated);
      const customOnly = storeData.customGames.filter(g => g.id !== game.id);
      const favs = storeData.favorites.filter(f => f !== game.id);
      saveStore({ ...storeData, customGames: customOnly, favorites: favs });
      addToast({ message: `Removed ${game.name}.`, type: 'success' });
    } else {
      window.api.uninstallGame({ source: game.source, appId: game.appId });
    }
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (detailGame) setDetailGame(null);
        else if (contextMenu) setContextMenu(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailGame, contextMenu]);

  const cardSizeMap = { small: '140px', medium: '165px', large: '200px' };

  return (
    <div className="app" onClick={() => setContextMenu(null)}
      style={{ '--card-min-w': cardSizeMap[storeData.settings.cardSize] } as React.CSSProperties}
    >
      <TitleBar updateStatus={updateStatus} onGoToSettings={() => setPage('settings')} />
      <div className="app-content">
        <Sidebar
          filter={filter}
          page={page}
          onFilterChange={setFilter}
          onPageChange={setPage}
          counts={counts}
          collections={storeData.collections}
          accounts={storeData.accounts || DEFAULT_ACCOUNTS}
          activeAccountId={storeData.settings.activeAccountId || 'default'}
          onSwitchAccount={id => saveStore({ ...storeData, settings: { ...storeData.settings, activeAccountId: id } })}
          onAddCustomGame={handleAddCustomGame}
          onRescan={() => { addToast({ message: 'Rescanning libraries...', type: 'info' }); scanAllLibraries().then(() => addToast({ message: 'Rescan complete.', type: 'success' })); }}
        />
        <main className="main-content">
          {page === 'settings' ? (
            <SettingsPage
              settings={storeData.settings}
              accounts={storeData.accounts || DEFAULT_ACCOUNTS}
              collections={storeData.collections}
              updateStatus={updateStatus}
              onSaveSettings={s => saveStore({ ...storeData, settings: s })}
              onSaveAccounts={a => saveStore({ ...storeData, accounts: a })}
              onImportSteamAccounts={handleImportSteamAccounts}
              onSaveCollections={c => saveStore({ ...storeData, collections: c })}
              onToast={addToast}
            />
          ) : (
            <>
              <div className="content-header">
                <div className="search-bar">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input type="text" placeholder="Search games..." value={filter.search}
                    onChange={e => setFilter({ ...filter, search: e.target.value })} />
                </div>
                <div className="header-controls">
                  <div className="sort-control">
                    <select value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}>
                      <option value="favorites-first">Favorites First</option>
                      <option value="a-z">A - Z</option>
                      <option value="z-a">Z - A</option>
                      <option value="recent">Recently Played</option>
                      <option value="play-time">Play Time</option>
                      <option value="size">Size</option>
                    </select>
                  </div>
                  <div className="view-toggle">
                    <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} aria-label="Grid view">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
                    </button>
                    <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} aria-label="List view">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="2.5" rx="0.5"/><rect x="1" y="6.75" width="14" height="2.5" rx="0.5"/><rect x="1" y="11.5" width="14" height="2.5" rx="0.5"/></svg>
                    </button>
                  </div>
                </div>
                <span className="game-count">{totalCount} games</span>
              </div>
              <GameGrid
                sections={sections}
                loading={loading}
                favorites={favorites}
                runningGames={runningGames}
                gameDataMap={storeData.gameData}
                viewMode={viewMode}
                onLaunch={handleLaunch}
                onContextMenu={handleContextMenu}
                onShowDetail={setDetailGame}
              />
            </>
          )}
        </main>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y} game={contextMenu.game}
          isFavorite={favorites.has(contextMenu.game.id)}
          collections={storeData.collections}
          gameCollections={getGameData(contextMenu.game.id).collections}
          onClose={() => setContextMenu(null)}
          onLaunch={handleLaunch}
          onToggleFavorite={toggleFavorite}
          onToast={(msg, type) => addToast({ message: msg, type })}
          onUninstall={handleUninstall}
          onShowDetail={g => { setDetailGame(g); setContextMenu(null); }}
          onToggleCollection={toggleGameCollection}
        />
      )}

      {detailGame && (
        <GameDetail
          game={detailGame}
          gameData={getGameData(detailGame.id)}
          collections={storeData.collections}
          accounts={storeData.accounts || DEFAULT_ACCOUNTS}
          isFavorite={favorites.has(detailGame.id)}
          onClose={() => setDetailGame(null)}
          onSaveGameData={saveGameData}
          onToggleFavorite={toggleFavorite}
          onLaunch={handleLaunch}
          onToast={addToast}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
