<p align="center">
  <img src="rLauncher Logo.png" alt="rLauncher" width="120" />
</p>

<h1 align="center">rLauncher</h1>

<p align="center">
  All your games in one place.
</p>

<p align="center">
  <a href="https://github.com/Ryzz3nn/rLauncher/releases/latest">
    <img src="https://img.shields.io/github/v/release/Ryzz3nn/rLauncher?style=flat-square" alt="Latest Release" />
  </a>
  <a href="https://github.com/Ryzz3nn/rLauncher/releases/latest">
    <img src="https://img.shields.io/github/downloads/Ryzz3nn/rLauncher/total?style=flat-square" alt="Downloads" />
  </a>
  <img src="https://img.shields.io/badge/platform-Windows-blue?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/github/license/Ryzz3nn/rLauncher?style=flat-square" alt="License" />
</p>

---

rLauncher is a lightweight, unified game launcher that automatically detects and organizes games from **Steam**, **Epic Games**, **GOG**, **EA**, and **Riot Games** into a single library. Browse your full collection, launch any game, and track playtime — all without switching between launchers.

<img width="1280" alt="Main library view" src="https://github.com/user-attachments/assets/7bdfc94d-fe8a-40b0-b953-6cb08ff4beb3" />

## Features

- **Unified Library** — Automatically scans and merges games from Steam, Epic, GOG, EA, and Riot
- **Owned but Not Installed** — See your full Steam library including uninstalled games, grayed out with one-click install
- **Play Time Tracking** — Per-account session tracking with Steam playtime sync
- **Multi-Account Support** — Switch between Steam accounts, import profiles with avatars
- **Grid & List Views** — Card grid or compact list, with adjustable card sizes
- **Collections & Favorites** — Organize games your way with custom collections and favorites
- **Game Details** — Notes, custom covers, launch arguments, pre/post-launch commands, save file backup
- **5 Themes** — Neutral, Midnight, Abyss, Charcoal, and OLED Black, plus 8 accent colors
- **System Tray** — Minimize or close to tray with a global hotkey to toggle visibility
- **Auto Updates** — Built-in update checker with one-click install via GitHub Releases
- **Low Memory** — Window is destroyed when in tray (~80MB idle), active usage ~150MB
- **Double-click Sources** — Double-click Steam, Epic, GOG, EA, or Riot in the sidebar to open that launcher directly

<img width="1280" alt="Not installed games" src="https://github.com/user-attachments/assets/04460368-b23b-49d9-8f7c-e4f91310e914" />

<img width="1280" alt="List view" src="https://github.com/user-attachments/assets/f531398e-7d85-4969-9b0c-5ba7657a91cc" />

## Download

Grab the latest release from the [Releases page](https://github.com/Ryzz3nn/rLauncher/releases/latest):

- **rLauncher-Setup-x.x.x.exe** — Installer (recommended)
- **rLauncher-x.x.x-portable.exe** — Portable, no install needed

## Build from Source

```bash
git clone https://github.com/Ryzz3nn/rLauncher.git
cd rLauncher
npm install
npm run dev        # development
npm run dist:win   # build installer + portable
```

## Tech Stack

- [Electron](https://www.electronjs.org/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) for bundling
- [electron-updater](https://www.electron.build/auto-update) for auto-updates
- No additional UI frameworks — pure CSS

## License

[MIT](LICENSE)
