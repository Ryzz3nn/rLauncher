import { app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { exec } from 'child_process';

export async function backupSaveFiles(
  gameId: string,
  saveLocations: string[]
): Promise<{ success: boolean; path?: string; message: string }> {
  const validPaths = saveLocations.filter(loc => {
    try {
      return fs.existsSync(loc);
    } catch {
      return false;
    }
  });

  if (validPaths.length === 0) {
    return { success: false, message: 'No valid save locations found.' };
  }

  const backupDir = path.join(app.getPath('userData'), 'backups');
  try {
    fs.mkdirSync(backupDir, { recursive: true });
  } catch {
    return { success: false, message: 'Could not create backup directory.' };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeId = gameId.replace(/[^a-zA-Z0-9-]/g, '_');
  const zipName = `${safeId}_${timestamp}.zip`;
  const zipPath = path.join(backupDir, zipName);

  if (process.platform === 'win32') {
    // Use PowerShell to create zip
    const pathsArg = validPaths.map(p => `'${p}'`).join(',');
    const cmd = `powershell -command "Compress-Archive -Path ${pathsArg} -DestinationPath '${zipPath}' -Force"`;

    return new Promise(resolve => {
      exec(cmd, (err) => {
        if (err) {
          resolve({ success: false, message: `Backup failed: ${err.message}` });
        } else {
          resolve({ success: true, path: zipPath, message: `Backup saved to ${zipPath}` });
        }
      });
    });
  } else {
    // Use tar on Linux/Mac
    const pathsArg = validPaths.map(p => `"${p}"`).join(' ');
    const cmd = `tar -czf "${zipPath.replace('.zip', '.tar.gz')}" ${pathsArg}`;

    return new Promise(resolve => {
      exec(cmd, (err) => {
        if (err) {
          resolve({ success: false, message: `Backup failed: ${err.message}` });
        } else {
          const finalPath = zipPath.replace('.zip', '.tar.gz');
          resolve({ success: true, path: finalPath, message: `Backup saved to ${finalPath}` });
        }
      });
    });
  }
}
