import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Games
  getSteamGames: () => ipcRenderer.invoke('get-steam-games'),
  getEpicGames: () => ipcRenderer.invoke('get-epic-games'),
  getGogGames: () => ipcRenderer.invoke('get-gog-games'),
  getEaGames: () => ipcRenderer.invoke('get-ea-games'),
  launchGame: (game: any) => ipcRenderer.invoke('launch-game', game),
  killGameProcess: (game: any) => ipcRenderer.invoke('kill-game-process', game),
  openInstallFolder: (dir: string) => ipcRenderer.invoke('open-install-folder', dir),
  openSteamPage: (appId: string) => ipcRenderer.invoke('open-steam-page', appId),
  uninstallGame: (game: any) => ipcRenderer.invoke('uninstall-game', game),
  getRunningGames: () => ipcRenderer.invoke('get-running-games'),

  // Steam
  fetchSteamPlaytime: () => ipcRenderer.invoke('fetch-steam-playtime'),
  detectSteamId: () => ipcRenderer.invoke('detect-steam-id'),

  // Store
  getStoreData: () => ipcRenderer.invoke('get-store-data'),
  saveStoreData: (data: any) => ipcRenderer.invoke('save-store-data', data),

  // Backup
  backupSaves: (gameId: string, locations: string[]) => ipcRenderer.invoke('backup-saves', gameId, locations),

  // Import/Export
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: () => ipcRenderer.invoke('import-data'),

  // Settings
  setStartWithWindows: (enabled: boolean) => ipcRenderer.invoke('set-start-with-windows', enabled),

  // Logs
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'),

  // Window
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),

  // Events
  onGameStopped: (callback: (gameId: string, duration: number) => void) => {
    const handler = (_event: any, gameId: string, duration: number) => callback(gameId, duration);
    ipcRenderer.on('game-stopped', handler);
    return () => ipcRenderer.removeListener('game-stopped', handler);
  },
  onTrayShowWindow: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('tray-show-window', handler);
    return () => ipcRenderer.removeListener('tray-show-window', handler);
  },
});
