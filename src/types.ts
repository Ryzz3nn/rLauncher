export interface Game {
  id: string;
  appId?: string;
  name: string;
  source: 'steam' | 'epic' | 'ea' | 'gog' | 'custom';
  installDir?: string;
  executablePath?: string;
  sizeOnDisk?: number;
  coverUrl?: string;
}

export interface GameFilter {
  source: 'all' | 'steam' | 'epic' | 'ea' | 'gog' | 'custom' | 'favorites' | 'recent';
  search: string;
  collectionId?: string;
}

export type SortMode = 'favorites-first' | 'a-z' | 'z-a' | 'size' | 'recent' | 'play-time';
export type ViewMode = 'grid' | 'list';
export type AppPage = 'library' | 'settings';

export interface GameSection {
  label: string;
  games: Game[];
}

export interface PlaySession {
  start: string;
  end: string;
  duration: number;
}

export interface AccountPlayData {
  totalPlayTime: number;
  lastPlayed: string | null;
  sessions: PlaySession[];
}

export interface GameData {
  // Per-account playtime (keyed by account ID)
  accountPlayTime: Record<string, AccountPlayData>;
  // Settings (shared across accounts)
  launchArgs: string;
  preLaunchCmd: string;
  postLaunchCmd: string;
  customCoverUrl: string | null;
  notes: string;
  saveLocations: string[];
  collections: string[];
  // Legacy fields kept for backward compat / convenience getters
  totalPlayTime: number;
  lastPlayed: string | null;
  sessions: PlaySession[];
}

export interface Account {
  id: string;
  name: string;
  avatar: string; // URL or data URI
  color: string;
  steamId?: string; // linked Steam ID for playtime sync
}

export interface Collection {
  id: string;
  name: string;
  color: string;
}

export type ThemeId = 'neutral' | 'midnight' | 'abyss' | 'charcoal';

export interface AppSettings {
  startWithWindows: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  globalHotkey: string;
  theme: ThemeId;
  accentColor: string;
  cardSize: 'small' | 'medium' | 'large';
  steamApiKey: string;
  steamId: string;
  activeAccountId: string;
}

export interface StoreData {
  settings: AppSettings;
  gameData: Record<string, GameData>;
  collections: Collection[];
  favorites: string[];
  customGames: Game[];
  accounts: Account[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// Helper: compute total playtime across all accounts for a game
export function getTotalPlayTime(gd: GameData | undefined): number {
  if (!gd) return 0;
  if (gd.accountPlayTime && Object.keys(gd.accountPlayTime).length > 0) {
    return Object.values(gd.accountPlayTime).reduce((sum, a) => sum + (a.totalPlayTime || 0), 0);
  }
  return gd.totalPlayTime || 0;
}

export function getLastPlayed(gd: GameData | undefined): string | null {
  if (!gd) return null;
  if (gd.accountPlayTime && Object.keys(gd.accountPlayTime).length > 0) {
    let latest: string | null = null;
    for (const a of Object.values(gd.accountPlayTime)) {
      if (a.lastPlayed && (!latest || a.lastPlayed > latest)) latest = a.lastPlayed;
    }
    return latest;
  }
  return gd.lastPlayed || null;
}

declare global {
  interface Window {
    api: {
      // Games
      getSteamGames: () => Promise<any[]>;
      getEpicGames: () => Promise<any[]>;
      getGogGames: () => Promise<any[]>;
      getEaGames: () => Promise<any[]>;
      launchGame: (game: { source: string; appId?: string; executablePath?: string; id: string; launchArgs?: string; preLaunchCmd?: string; postLaunchCmd?: string }) => Promise<void>;
      killGameProcess: (game: { name: string; installDir?: string; gameId?: string }) => Promise<{ success: boolean; message: string }>;
      openInstallFolder: (dir: string) => Promise<void>;
      openSteamPage: (appId: string) => Promise<void>;
      uninstallGame: (game: { source: string; appId?: string }) => Promise<void>;
      getRunningGames: () => Promise<string[]>;

      // Store
      getStoreData: () => Promise<StoreData>;
      saveStoreData: (data: StoreData) => Promise<void>;

      // Backup
      backupSaves: (gameId: string, locations: string[]) => Promise<{ success: boolean; path?: string; message: string }>;

      // Import/Export
      exportData: () => Promise<{ success: boolean; path?: string }>;
      importData: () => Promise<{ success: boolean; data?: StoreData }>;

      // Steam
      fetchSteamPlaytime: (steamId?: string) => Promise<Record<string, number>>;
      detectSteamId: () => Promise<string>;
      getSteamAccounts: () => Promise<{ steamId: string; accountName: string; personaName: string; mostRecent: boolean }[]>;
      fetchSteamProfiles: (steamIds: string[]) => Promise<{ steamId: string; personaName: string; avatarUrl: string; profileUrl: string }[]>;

      // Settings
      setStartWithWindows: (enabled: boolean) => Promise<void>;

      // Logs
      openLogsFolder: () => Promise<void>;

      // Updates
      checkForUpdates: () => Promise<void>;
      downloadUpdate: () => Promise<void>;
      installUpdate: () => Promise<void>;
      getAppVersion: () => Promise<string>;
      onUpdateStatus: (callback: (status: { status: string; version?: string; percent?: number; message?: string }) => void) => () => void;

      // Window
      toggleAlwaysOnTop: () => Promise<boolean>;
      getAlwaysOnTop: () => Promise<boolean>;
      windowMinimize: () => Promise<void>;
      windowMaximize: () => Promise<void>;
      windowClose: () => Promise<void>;

      // Events
      onGameStopped: (callback: (gameId: string, duration: number) => void) => () => void;
      onTrayShowWindow: (callback: () => void) => () => void;
    };
  }
}
