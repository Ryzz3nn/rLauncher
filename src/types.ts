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

export interface GameData {
  totalPlayTime: number;
  lastPlayed: string | null;
  sessions: PlaySession[];
  launchArgs: string;
  preLaunchCmd: string;
  postLaunchCmd: string;
  customCoverUrl: string | null;
  notes: string;
  saveLocations: string[];
  collections: string[];
}

export interface Collection {
  id: string;
  name: string;
  color: string;
}

export interface AppSettings {
  startWithWindows: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  globalHotkey: string;
  accentColor: string;
  cardSize: 'small' | 'medium' | 'large';
  steamApiKey: string;
  steamId: string;
}

export interface StoreData {
  settings: AppSettings;
  gameData: Record<string, GameData>;
  collections: Collection[];
  favorites: string[];
  customGames: Game[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
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
      fetchSteamPlaytime: () => Promise<Record<string, number>>;
      detectSteamId: () => Promise<string>;

      // Settings
      setStartWithWindows: (enabled: boolean) => Promise<void>;

      // Logs
      openLogsFolder: () => Promise<void>;

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
