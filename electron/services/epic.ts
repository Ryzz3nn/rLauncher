import fs from 'fs';
import path from 'path';

interface EpicGame {
  appId: string;
  name: string;
  installDir: string;
  sizeOnDisk: number;
  executablePath?: string;
}

export async function scanEpicLibrary(): Promise<EpicGame[]> {
  if (process.platform !== 'win32') return [];

  const games: EpicGame[] = [];
  const manifestDirs = [
    'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests',
  ];

  for (const dir of manifestDirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.item'));

      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
          const manifest = JSON.parse(raw);

          if (!manifest.DisplayName || !manifest.InstallLocation) continue;
          // Skip DLC and plugins
          if (manifest.bIsIncompleteInstall) continue;

          games.push({
            appId: manifest.AppName || manifest.CatalogItemId || file.replace('.item', ''),
            name: manifest.DisplayName,
            installDir: manifest.InstallLocation,
            sizeOnDisk: manifest.InstallSize || 0,
            executablePath: manifest.LaunchExecutable
              ? path.join(manifest.InstallLocation, manifest.LaunchExecutable)
              : undefined,
          });
        } catch {
          // Skip unparseable manifests
        }
      }
    } catch {
      // Directory not accessible
    }
  }

  return games.sort((a, b) => a.name.localeCompare(b.name));
}
