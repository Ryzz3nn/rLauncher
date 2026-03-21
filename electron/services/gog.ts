import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

interface GogGame {
  appId: string;
  name: string;
  installDir: string;
  sizeOnDisk: number;
  executablePath?: string;
}

export async function scanGogLibrary(): Promise<GogGame[]> {
  if (process.platform !== 'win32') return [];

  const games: GogGame[] = [];

  // Method 1: Read from registry
  try {
    const regGames = await readGogRegistry();
    games.push(...regGames);
  } catch {
    // Registry not available
  }

  // Method 2: Scan common install paths for goggame-*.info files
  if (games.length === 0) {
    const searchPaths = [
      'C:\\GOG Games',
      'C:\\Program Files (x86)\\GOG Galaxy\\Games',
      'C:\\Program Files\\GOG Galaxy\\Games',
    ];

    for (const searchPath of searchPaths) {
      try {
        if (!fs.existsSync(searchPath)) continue;
        const dirs = fs.readdirSync(searchPath, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => path.join(searchPath, d.name));

        for (const dir of dirs) {
          const infoFiles = fs.readdirSync(dir).filter(f => f.match(/^goggame-\d+\.info$/));
          for (const infoFile of infoFiles) {
            try {
              const raw = fs.readFileSync(path.join(dir, infoFile), 'utf-8');
              const info = JSON.parse(raw);
              if (!info.name) continue;

              games.push({
                appId: info.gameId || infoFile.match(/\d+/)?.[0] || '',
                name: info.name,
                installDir: dir,
                sizeOnDisk: 0,
                executablePath: info.playTasks?.[0]?.path
                  ? path.join(dir, info.playTasks[0].path)
                  : undefined,
              });
            } catch {
              // Skip unparseable info files
            }
          }
        }
      } catch {
        // Path not accessible
      }
    }
  }

  return games.sort((a, b) => a.name.localeCompare(b.name));
}

function readGogRegistry(): Promise<GogGame[]> {
  return new Promise((resolve) => {
    exec(
      'reg query "HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games" /s',
      { encoding: 'utf-8' },
      (err, stdout) => {
        if (err || !stdout) {
          resolve([]);
          return;
        }

        const games: GogGame[] = [];
        const blocks = stdout.split(/\r?\n\r?\n/).filter(b => b.includes('gameName'));

        for (const block of blocks) {
          const getName = (key: string) => {
            const match = block.match(new RegExp(`${key}\\s+REG_SZ\\s+(.+)`));
            return match?.[1]?.trim() || '';
          };

          const name = getName('gameName');
          const gamePath = getName('path') || getName('PATH');
          const gameId = getName('gameID');
          const exe = getName('exe');

          if (name && gamePath) {
            games.push({
              appId: gameId,
              name,
              installDir: gamePath,
              sizeOnDisk: 0,
              executablePath: exe ? path.join(gamePath, exe) : undefined,
            });
          }
        }

        resolve(games);
      }
    );
  });
}
