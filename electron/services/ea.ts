import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

interface EaGame {
  appId: string;
  name: string;
  installDir: string;
  sizeOnDisk: number;
  executablePath?: string;
}

export async function scanEaLibrary(): Promise<EaGame[]> {
  if (process.platform !== 'win32') return [];

  const games: EaGame[] = [];

  // Method 1: Check EA Desktop install info from registry
  try {
    const regGames = await readEaRegistry();
    games.push(...regGames);
  } catch {
    // Registry not available
  }

  // Method 2: Scan common EA install paths
  if (games.length === 0) {
    const searchPaths = [
      'C:\\Program Files\\EA Games',
      'C:\\Program Files (x86)\\EA Games',
      'C:\\Program Files\\Electronic Arts',
      'C:\\Program Files (x86)\\Electronic Arts',
      'C:\\Program Files (x86)\\Origin Games',
    ];

    for (const searchPath of searchPaths) {
      try {
        if (!fs.existsSync(searchPath)) continue;
        const dirs = fs.readdirSync(searchPath, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => ({ name: d.name, full: path.join(searchPath, d.name) }));

        for (const dir of dirs) {
          // Look for exe files to confirm it's a game
          try {
            const files = fs.readdirSync(dir.full);
            const mainExe = files.find(f => f.endsWith('.exe') && !f.includes('unins') && !f.includes('setup'));
            if (mainExe) {
              games.push({
                appId: dir.name.replace(/\s+/g, '-').toLowerCase(),
                name: dir.name,
                installDir: dir.full,
                sizeOnDisk: 0,
                executablePath: path.join(dir.full, mainExe),
              });
            }
          } catch {
            // Can't read dir
          }
        }
      } catch {
        // Path not accessible
      }
    }
  }

  return games.sort((a, b) => a.name.localeCompare(b.name));
}

function readEaRegistry(): Promise<EaGame[]> {
  return new Promise((resolve) => {
    // Try multiple registry locations
    const regPaths = [
      'HKLM\\SOFTWARE\\WOW6432Node\\EA Games',
      'HKLM\\SOFTWARE\\EA Games',
      'HKLM\\SOFTWARE\\WOW6432Node\\Electronic Arts\\EA Desktop\\InstallInfo',
    ];

    let completed = 0;
    const allGames: EaGame[] = [];

    for (const regPath of regPaths) {
      exec(
        `reg query "${regPath}" /s`,
        { encoding: 'utf-8' },
        (err, stdout) => {
          completed++;

          if (!err && stdout) {
            const blocks = stdout.split(/\r?\n\r?\n/).filter(b =>
              b.includes('REG_SZ') && (b.includes('Install Dir') || b.includes('InstallDir'))
            );

            for (const block of blocks) {
              const getName = (key: string) => {
                const match = block.match(new RegExp(`${key}\\s+REG_SZ\\s+(.+)`, 'i'));
                return match?.[1]?.trim() || '';
              };

              const installDir = getName('Install Dir') || getName('InstallDir') || getName('Install Location');
              const displayName = getName('DisplayName') || getName('Display Name');

              if (installDir && fs.existsSync(installDir)) {
                const name = displayName || path.basename(installDir);
                allGames.push({
                  appId: name.replace(/\s+/g, '-').toLowerCase(),
                  name,
                  installDir,
                  sizeOnDisk: 0,
                });
              }
            }
          }

          if (completed === regPaths.length) {
            resolve(allGames);
          }
        }
      );
    }
  });
}
