import { exec, execFile } from 'child_process';
import { BrowserWindow } from 'electron';

interface TrackedGame {
  gameId: string;
  installDir?: string;
  name: string;
  startTime: number;
}

const trackedGames: Map<string, TrackedGame> = new Map();
let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startTracking(gameId: string, name: string, installDir?: string): void {
  trackedGames.set(gameId, {
    gameId,
    installDir,
    name,
    startTime: Date.now(),
  });

  if (!pollInterval) {
    // Start polling after a delay to let the game launch
    setTimeout(() => {
      pollInterval = setInterval(() => checkProcesses(), 15000);
    }, 20000);
  }
}

export function getTrackedGameIds(): string[] {
  return [...trackedGames.keys()];
}

export function stopTracking(gameId: string): void {
  trackedGames.delete(gameId);
}

function checkProcesses(): void {
  if (trackedGames.size === 0) {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    return;
  }

  trackedGames.forEach((game, gameId) => {
    isGameRunning(game).then(running => {
      if (!running) {
        const duration = Date.now() - game.startTime;
        // Only record if played for at least 30 seconds
        if (duration > 30000) {
          notifyGameStopped(gameId, duration);
        }
        trackedGames.delete(gameId);

        if (trackedGames.size === 0 && pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    });
  });
}

function isGameRunning(game: TrackedGame): Promise<boolean> {
  return new Promise(resolve => {
    if (process.platform === 'win32') {
      const filter = game.installDir
        ? `$_.Path -and $_.Path -like '*${game.installDir.replace(/'/g, "''").replace(/\//g, '\\')}*'`
        : `$_.MainWindowTitle -like '*${game.name.replace(/'/g, "''")}*'`;

      const script = `(Get-Process | Where-Object { ${filter} }).Count`;

      execFile('powershell.exe', ['-NoProfile', '-Command', script],
        (err, stdout) => {
          const count = parseInt(stdout.trim(), 10);
          resolve(!err && count > 0);
        }
      );
    } else {
      const pattern = game.installDir || game.name;
      exec(`pgrep -fi "${pattern.replace(/"/g, '\\"')}"`, err => {
        resolve(!err);
      });
    }
  });
}

function notifyGameStopped(gameId: string, duration: number): void {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(win => {
    win.webContents.send('game-stopped', gameId, duration);
  });
}
