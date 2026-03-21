import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, globalShortcut, dialog, safeStorage } from 'electron';
import { exec, execFile } from 'child_process';
import path from 'path';
import fs from 'fs';

// ── Logging ──
let logPath = '';

function getLogPath(): string {
  if (!logPath) {
    logPath = path.join(app.getPath('userData'), 'rlauncher.log');
  }
  return logPath;
}

function log(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(getLogPath(), line, 'utf-8');
  } catch { /* ignore */ }
  console.log(msg);
}
import { scanSteamLibrary, fetchSteamPlaytime, detectSteamId } from './services/steam';
import { scanEpicLibrary } from './services/epic';
import { scanGogLibrary } from './services/gog';
import { scanEaLibrary } from './services/ea';
import { loadStore, saveStore } from './services/store';
import { startTracking, getTrackedGameIds, stopTracking } from './services/process-monitor';
import { backupSaveFiles } from './services/backup';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let store = loadStore();

function createWindow() {
  const windowIcon = nativeImage.createFromPath(
    path.join(__dirname, '../src/assets/logo.png')
  );

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    icon: windowIcon,
    backgroundColor: '#0d0d1a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('focus', () => mainWindow?.webContents.invalidate());
  mainWindow.on('restore', () => mainWindow?.webContents.invalidate());
  mainWindow.on('show', () => mainWindow?.webContents.invalidate());

  mainWindow.on('close', (e) => {
    if (store.settings.closeToTray && tray) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('minimize', () => {
    if (store.settings.minimizeToTray && tray) {
      mainWindow?.hide();
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function createTray() {
  // Use the rLauncher logo as tray icon
  const logoPath = path.join(__dirname, '../src/assets/logo.png');
  let icon: Electron.NativeImage;
  try {
    icon = nativeImage.createFromPath(logoPath).resize({ width: 16, height: 16 });
  } catch {
    // Fallback to a simple icon if logo not found
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('rLauncher');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show rLauncher',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        tray?.destroy();
        tray = null;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function registerGlobalHotkey() {
  const hotkey = store.settings.globalHotkey;
  if (!hotkey) return;

  try {
    globalShortcut.unregisterAll();
    globalShortcut.register(hotkey, () => {
      if (mainWindow?.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide();
      } else {
        mainWindow?.show();
        mainWindow?.focus();
      }
    });
  } catch (err) {
    console.error('Failed to register global hotkey:', err);
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalHotkey();

  if (store.settings.startWithWindows) {
    app.setLoginItemSettings({ openAtLogin: true });
  }

  // ── Game Library Scanning ──

  ipcMain.handle('get-steam-games', async () => {
    try { return await scanSteamLibrary(); }
    catch (err) { console.error('Steam scan failed:', err); return []; }
  });

  ipcMain.handle('get-epic-games', async () => {
    try { return await scanEpicLibrary(); }
    catch (err) { console.error('Epic scan failed:', err); return []; }
  });

  ipcMain.handle('get-gog-games', async () => {
    try { return await scanGogLibrary(); }
    catch (err) { console.error('GOG scan failed:', err); return []; }
  });

  ipcMain.handle('get-ea-games', async () => {
    try { return await scanEaLibrary(); }
    catch (err) { console.error('EA scan failed:', err); return []; }
  });

  // ── Game Actions ──

  ipcMain.handle('launch-game', async (_event, game: {
    source: string; appId?: string; executablePath?: string;
    id: string; launchArgs?: string; preLaunchCmd?: string; postLaunchCmd?: string;
  }) => {
    // Pre-launch command
    if (game.preLaunchCmd) {
      await new Promise<void>((resolve) => {
        exec(game.preLaunchCmd!, (err) => {
          if (err) console.error('Pre-launch command failed:', err);
          resolve();
        });
      });
    }

    // Launch the game
    if (game.source === 'steam' && game.appId) {
      const args = game.launchArgs ? `//${game.launchArgs}` : '';
      await shell.openExternal(`steam://rungameid/${game.appId}${args}`);
    } else if (game.source === 'epic' && game.appId) {
      await shell.openExternal(`com.epicgames.launcher://apps/${game.appId}?action=launch`);
    } else if (game.executablePath) {
      if (game.launchArgs) {
        exec(`"${game.executablePath}" ${game.launchArgs}`);
      } else {
        await shell.openPath(game.executablePath);
      }
    }

    // Start tracking play time
    const gameData = store.gameData[game.id] || {};
    startTracking(game.id, gameData.name || game.id, gameData.installDir);

    // Post-launch command (fire and forget)
    if (game.postLaunchCmd) {
      exec(game.postLaunchCmd, (err) => {
        if (err) console.error('Post-launch command failed:', err);
      });
    }
  });

  ipcMain.handle('kill-game-process', async (_event, game: { name: string; installDir?: string; gameId?: string }) => {
    log(`[KILL] Attempting to kill: name="${game.name}" installDir="${game.installDir || 'none'}" gameId="${game.gameId || 'none'}"`);

    const onKillSuccess = () => {
      // Clear tracking so the "Running" indicator goes away immediately
      if (game.gameId) {
        stopTracking(game.gameId);
        // Notify renderer immediately
        mainWindow?.webContents.send('game-stopped', game.gameId, 0);
      }
    };

    if (process.platform === 'win32') {
      // Strategy 1: Kill by install directory path
      if (game.installDir) {
        const dir = game.installDir.replace(/\//g, '\\');
        log(`[KILL] Strategy 1: searching by path containing "${dir}"`);
        const result1 = await psKill(`$_.Path -and $_.Path -like '*${dir.replace(/'/g, "''")}*'`);
        if (result1.success) {
          log(`[KILL] Strategy 1 succeeded: ${result1.message}`);
          onKillSuccess();
          return result1;
        }
        log(`[KILL] Strategy 1 failed: ${result1.message}`);
      }

      // Strategy 2: Kill by window title
      log(`[KILL] Strategy 2: searching by window title containing "${game.name}"`);
      const result2 = await psKill(`$_.MainWindowTitle -like '*${game.name.replace(/'/g, "''")}*'`);
      if (result2.success) {
        log(`[KILL] Strategy 2 succeeded: ${result2.message}`);
        onKillSuccess();
        return result2;
      }
      log(`[KILL] Strategy 2 failed: ${result2.message}`);

      // Strategy 3: Kill by process name (find exes in install dir)
      if (game.installDir) {
        log(`[KILL] Strategy 3: scanning install dir for exe names`);
        try {
          const dir = game.installDir.replace(/\//g, '\\');
          const files = fs.readdirSync(dir);
          const exes = files.filter(f => f.endsWith('.exe') && !f.toLowerCase().includes('unins') && !f.toLowerCase().includes('redist') && !f.toLowerCase().includes('crash'));
          log(`[KILL] Found exes: ${exes.join(', ')}`);

          for (const exe of exes) {
            const result3 = await psKill(`$_.ProcessName -eq '${exe.replace(/\.exe$/i, '').replace(/'/g, "''")}'`);
            if (result3.success) {
              log(`[KILL] Strategy 3 succeeded with ${exe}: ${result3.message}`);
              onKillSuccess();
              return result3;
            }
          }
          log(`[KILL] Strategy 3: no exe matched a running process`);
        } catch (err) {
          log(`[KILL] Strategy 3: could not read install dir: ${err}`);
        }
      }

      log(`[KILL] All strategies failed for "${game.name}"`);
      return { success: false, message: 'No matching process found. Check logs for details.' };
    } else {
      const pattern = game.installDir || game.name;
      return new Promise(resolve => {
        exec(`pkill -f "${pattern.replace(/"/g, '\\"')}"`, (error) => {
          if (!error) onKillSuccess();
          resolve({
            success: !error,
            message: error ? 'No matching process found.' : `Terminated ${game.name}.`,
          });
        });
      });
    }
  });

  // Find matching PIDs using PowerShell, then kill them — elevating via UAC if needed
  function psKill(whereClause: string): Promise<{ success: boolean; message: string }> {
    return new Promise(resolve => {
      // Step 1: find PIDs
      const findScript = [
        `$p = @(Get-Process | Where-Object { ${whereClause} })`,
        `foreach ($proc in $p) { Write-Output "$($proc.Id)|$($proc.ProcessName)|$($proc.Path)" }`,
      ].join('; ');

      log(`[KILL:PS] Finding: ${findScript}`);

      execFile('powershell.exe', ['-NoProfile', '-Command', findScript],
        (error, stdout, stderr) => {
          if (stderr) log(`[KILL:PS] find stderr: ${stderr.trim()}`);
          const lines = stdout.trim().split('\n').filter(l => l.trim());
          log(`[KILL:PS] Found ${lines.length} process(es): ${stdout.trim()}`);

          if (lines.length === 0) {
            resolve({ success: false, message: 'No match' });
            return;
          }

          // Collect PIDs
          const pids = lines.map(l => l.split('|')[0].trim()).filter(Boolean);
          log(`[KILL:PS] PIDs to kill: ${pids.join(', ')}`);

          // Step 2: try killing without elevation first
          const pidArgs = pids.map(p => `/PID ${p}`).join(' ');
          exec(`taskkill /F ${pidArgs}`, (err1, out1, serr1) => {
            log(`[KILL:TK] taskkill stdout: ${out1.trim()}`);
            if (serr1) log(`[KILL:TK] taskkill stderr: ${serr1.trim()}`);

            if (!err1) {
              log(`[KILL] Killed successfully without elevation`);
              resolve({ success: true, message: `Terminated processes.` });
              return;
            }

            // Step 3: access denied — elevate via UAC
            log(`[KILL] taskkill failed (likely access denied), elevating via UAC...`);
            const elevatedArgs = `/F ${pidArgs}`;
            execFile('powershell.exe', [
              '-NoProfile', '-Command',
              `Start-Process -Verb RunAs -FilePath taskkill -ArgumentList '${elevatedArgs}' -Wait -WindowStyle Hidden`,
            ], (err2, out2, serr2) => {
              log(`[KILL:ELEVATED] stdout: ${out2.trim()}`);
              if (serr2) log(`[KILL:ELEVATED] stderr: ${serr2.trim()}`);
              if (err2) {
                log(`[KILL:ELEVATED] error: ${err2.message}`);
                resolve({ success: false, message: 'Access denied. UAC prompt may have been dismissed.' });
              } else {
                log(`[KILL:ELEVATED] Killed successfully with elevation`);
                resolve({ success: true, message: `Terminated processes (admin).` });
              }
            });
          });
        }
      );
    });
  }

  ipcMain.handle('get-running-games', () => getTrackedGameIds());

  ipcMain.handle('open-install-folder', async (_event, dir: string) => {
    if (dir) await shell.openPath(dir);
  });

  ipcMain.handle('open-steam-page', async (_event, appId: string) => {
    await shell.openExternal(`steam://nav/games/details/${appId}`);
  });

  ipcMain.handle('uninstall-game', async (_event, game: { source: string; appId?: string }) => {
    if (game.source === 'steam' && game.appId) {
      await shell.openExternal(`steam://uninstall/${game.appId}`);
    } else if (game.source === 'epic' && game.appId) {
      await shell.openExternal(`com.epicgames.launcher://apps/${game.appId}?action=uninstall`);
    }
  });

  // ── Store ──

  ipcMain.handle('get-store-data', () => {
    store = loadStore();
    // Decrypt the API key for the renderer
    const decryptedStore = { ...store, settings: { ...store.settings } };
    if (decryptedStore.settings.steamApiKey && safeStorage.isEncryptionAvailable()) {
      try {
        decryptedStore.settings.steamApiKey = safeStorage.decryptString(
          Buffer.from(decryptedStore.settings.steamApiKey, 'base64')
        );
      } catch {
        // Stored as plaintext (legacy) or corrupted — pass through as-is
      }
    }
    // Keep decrypted version in memory for API calls
    store = decryptedStore;
    return decryptedStore;
  });

  ipcMain.handle('save-store-data', (_event, data: typeof store) => {
    // Keep plaintext in memory for API calls
    store = data;
    // Encrypt the API key before writing to disk
    const toSave = { ...data, settings: { ...data.settings } };
    if (toSave.settings.steamApiKey && safeStorage.isEncryptionAvailable()) {
      toSave.settings.steamApiKey = safeStorage.encryptString(toSave.settings.steamApiKey).toString('base64');
    }
    saveStore(toSave);
    registerGlobalHotkey();
  });

  // ── Backup ──

  ipcMain.handle('backup-saves', async (_event, gameId: string, locations: string[]) => {
    return await backupSaveFiles(gameId, locations);
  });

  // ── Import/Export ──

  ipcMain.handle('export-data', async () => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: 'rlauncher-export.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { success: false };
    try {
      // Strip sensitive data from export
      const exportData = { ...store, settings: { ...store.settings, steamApiKey: '' } };
      fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8');
      return { success: true, path: result.filePath };
    } catch {
      return { success: false };
    }
  });

  ipcMain.handle('import-data', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return { success: false };
    try {
      const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
      const data = JSON.parse(raw);
      store = data;
      saveStore(data);
      return { success: true, data };
    } catch {
      return { success: false };
    }
  });

  // ── Settings ──

  ipcMain.handle('fetch-steam-playtime', async () => {
    return await fetchSteamPlaytime(store.settings.steamApiKey || '', store.settings.steamId || '');
  });

  ipcMain.handle('detect-steam-id', () => {
    return detectSteamId();
  });

  ipcMain.handle('set-start-with-windows', (_event, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
  });

  ipcMain.handle('open-logs-folder', () => {
    shell.showItemInFolder(getLogPath());
  });

  // ── Window Controls ──

  ipcMain.handle('toggle-always-on-top', () => {
    if (!mainWindow) return false;
    const next = !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(next);
    return next;
  });

  ipcMain.handle('get-always-on-top', () => mainWindow?.isAlwaysOnTop() ?? false);
  ipcMain.handle('window-minimize', () => mainWindow?.minimize());
  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle('window-close', () => {
    if (store.settings.closeToTray && tray) {
      mainWindow?.hide();
    } else {
      mainWindow?.close();
    }
  });
});

app.on('window-all-closed', () => {
  if (!store.settings.closeToTray) {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  tray?.destroy();
});
