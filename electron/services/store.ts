import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const STORE_FILE = 'rlauncher-data.json';

interface AppSettings {
  startWithWindows: boolean;
  minimizeToTray: boolean;
  closeToTray: boolean;
  globalHotkey: string;
  accentColor: string;
  cardSize: 'small' | 'medium' | 'large';
  steamApiKey: string;
  steamId: string;
  activeAccountId: string;
}

interface StoreData {
  settings: AppSettings;
  gameData: Record<string, any>;
  collections: any[];
  favorites: string[];
  customGames: any[];
  accounts: any[];
}

const defaults: StoreData = {
  settings: {
    startWithWindows: false,
    minimizeToTray: false,
    closeToTray: false,
    globalHotkey: 'CommandOrControl+Shift+G',
    accentColor: '#7c3aed',
    cardSize: 'medium',
    steamApiKey: '',
    steamId: '',
    activeAccountId: 'default',
  },
  gameData: {},
  collections: [],
  favorites: [],
  customGames: [],
  accounts: [{ id: 'default', name: 'Default', avatar: '', color: '#7c3aed' }],
};

function getStorePath(): string {
  return path.join(app.getPath('userData'), STORE_FILE);
}

export function loadStore(): StoreData {
  try {
    const raw = fs.readFileSync(getStorePath(), 'utf-8');
    const data = JSON.parse(raw);
    return { ...defaults, ...data, settings: { ...defaults.settings, ...data.settings } };
  } catch {
    return { ...defaults };
  }
}

export function saveStore(data: StoreData): void {
  try {
    fs.writeFileSync(getStorePath(), JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store:', err);
  }
}

export function getGameData(store: StoreData, gameId: string) {
  return store.gameData[gameId] || {
    totalPlayTime: 0,
    lastPlayed: null,
    sessions: [],
    launchArgs: '',
    preLaunchCmd: '',
    postLaunchCmd: '',
    customCoverUrl: null,
    notes: '',
    saveLocations: [],
    collections: [],
  };
}

export function exportStore(): string {
  return getStorePath();
}

export function importStore(filePath: string): StoreData | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
