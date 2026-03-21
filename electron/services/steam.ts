import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';

export interface SteamGame {
  appId: string;
  name: string;
  installDir: string;
  sizeOnDisk: number;
  source: 'steam';
}

/**
 * Simple VDF/ACF parser — handles the Valve key-value format
 * used by libraryfolders.vdf and appmanifest_*.acf files.
 */
function parseVdf(content: string): Record<string, any> {
  const result: Record<string, any> = {};
  const stack: any[] = [result];
  let currentKey = '';

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (trimmed === '{') {
      const obj: Record<string, any> = {};
      stack[stack.length - 1][currentKey] = obj;
      stack.push(obj);
    } else if (trimmed === '}') {
      stack.pop();
    } else {
      // "key"		"value"
      const kv = trimmed.match(/^"([^"]*)"[\s\t]+"([^"]*)"$/);
      if (kv) {
        stack[stack.length - 1][kv[1]] = kv[2];
      } else {
        // standalone "key"
        const k = trimmed.match(/^"([^"]*)"$/);
        if (k) currentKey = k[1];
      }
    }
  }

  return result;
}

/** Locate the Steam installation directory. */
function getSteamPath(): string | null {
  const platform = os.platform();

  if (platform === 'win32') {
    // Try Windows registry first
    try {
      const { execSync } = require('child_process');
      const reg = execSync(
        'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v InstallPath',
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
      );
      const match = reg.match(/InstallPath\s+REG_SZ\s+(.+)/);
      if (match) return match[1].trim();
    } catch { /* fall through */ }

    const candidates = [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      path.join(os.homedir(), 'Steam'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  } else if (platform === 'linux') {
    const candidates = [
      path.join(os.homedir(), '.steam/steam'),
      path.join(os.homedir(), '.local/share/Steam'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  } else if (platform === 'darwin') {
    const p = path.join(os.homedir(), 'Library/Application Support/Steam');
    if (fs.existsSync(p)) return p;
  }

  return null;
}

/** Read libraryfolders.vdf to find all Steam library directories. */
function getLibraryFolders(steamPath: string): string[] {
  const candidates = [
    path.join(steamPath, 'steamapps', 'libraryfolders.vdf'),
    path.join(steamPath, 'config', 'libraryfolders.vdf'),
  ];

  let content: string | null = null;
  for (const p of candidates) {
    try {
      content = fs.readFileSync(p, 'utf-8');
      break;
    } catch { /* try next */ }
  }

  if (!content) return [steamPath];

  const parsed = parseVdf(content);
  const root = parsed.libraryfolders || parsed.LibraryFolders;
  const folders: string[] = [];

  if (root) {
    for (const key of Object.keys(root)) {
      if (!/^\d+$/.test(key)) continue;
      const entry = root[key];
      if (typeof entry === 'object' && entry.path) {
        folders.push(entry.path);
      } else if (typeof entry === 'string') {
        folders.push(entry);
      }
    }
  }

  return folders.length > 0 ? folders : [steamPath];
}

// Names / prefixes to skip (tools, runtimes, redistributables)
const SKIP_PREFIXES = [
  'Steamworks',
  'Proton ',
  'Steam Linux Runtime',
];
const SKIP_SUBSTRINGS = [
  'Redistributable',
  'Redist',
  'DirectX',
  'Visual C++',
  'CEG',
];

function shouldSkip(name: string): boolean {
  for (const p of SKIP_PREFIXES) if (name.startsWith(p)) return true;
  for (const s of SKIP_SUBSTRINGS) if (name.includes(s)) return true;
  return false;
}

/** Scan all Steam library folders and return installed games. */
export async function scanSteamLibrary(): Promise<SteamGame[]> {
  const steamPath = getSteamPath();
  if (!steamPath) return [];

  const libraryFolders = getLibraryFolders(steamPath);
  const games: SteamGame[] = [];

  for (const folder of libraryFolders) {
    const steamappsDir = path.join(folder, 'steamapps');

    let files: string[];
    try {
      files = fs.readdirSync(steamappsDir);
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.startsWith('appmanifest_') || !file.endsWith('.acf')) continue;

      try {
        const content = fs.readFileSync(path.join(steamappsDir, file), 'utf-8');
        const parsed = parseVdf(content);
        const state = parsed.AppState;
        if (!state?.name || !state?.appid) continue;
        if (shouldSkip(state.name)) continue;

        games.push({
          appId: state.appid,
          name: state.name,
          installDir: path.join(steamappsDir, 'common', state.installdir || ''),
          sizeOnDisk: parseInt(state.SizeOnDisk || '0', 10),
          source: 'steam',
        });
      } catch {
        continue;
      }
    }
  }

  return games.sort((a, b) => a.name.localeCompare(b.name));
}

/** Auto-detect Steam ID from loginusers.vdf */
export function detectSteamId(): string {
  const steamPath = getSteamPath();
  if (!steamPath) return '';

  try {
    const loginUsersPath = path.join(steamPath, 'config', 'loginusers.vdf');
    const content = fs.readFileSync(loginUsersPath, 'utf-8');
    const parsed = parseVdf(content);
    const users = parsed.users || parsed.Users;
    if (!users) return '';

    // Find the most recently logged in user
    let bestId = '';
    let bestTimestamp = 0;
    for (const steamId of Object.keys(users)) {
      const user = users[steamId];
      const ts = parseInt(user.Timestamp || user.timestamp || '0', 10);
      if (ts > bestTimestamp || !bestId) {
        bestTimestamp = ts;
        bestId = steamId;
      }
    }
    return bestId;
  } catch {
    return '';
  }
}

/** Fetch playtime from Steam Web API. Returns map of appId -> playtime in ms. */
export function fetchSteamPlaytime(apiKey: string, steamId: string): Promise<Record<string, number>> {
  return new Promise((resolve) => {
    if (!apiKey || !steamId) {
      resolve({});
      return;
    }

    const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${encodeURIComponent(apiKey)}&steamid=${encodeURIComponent(steamId)}&include_played_free_games=1&format=json`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const games = json?.response?.games;
          if (!Array.isArray(games)) { resolve({}); return; }

          const result: Record<string, number> = {};
          for (const game of games) {
            if (game.appid && game.playtime_forever) {
              // Convert minutes to milliseconds
              result[String(game.appid)] = game.playtime_forever * 60 * 1000;
            }
          }
          resolve(result);
        } catch {
          resolve({});
        }
      });
    }).on('error', () => {
      resolve({});
    });
  });
}
