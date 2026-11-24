/**
 * Update Service
 * 
 * Handles OTA updates via electron-updater.
 */

import { autoUpdater, UpdateInfo } from 'electron-updater';
import { BrowserWindow } from 'electron';
import { logger } from '../utils/logger';

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  version: string | null;
  progress: number;
  error: string | null;
}

/**
 * electron-updater puts the whole HTTP response in its error message. Keep the
 * first line so the log and the UI stay readable.
 */
function firstLine(message: string): string {
  const line = (message || 'Update failed').split('\n')[0].trim();
  return line.length > 200 ? line.slice(0, 200) + '…' : line;
}

class UpdateService {
  private mainWindow: BrowserWindow | null = null;
  private status: UpdateStatus = {
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    version: null,
    progress: 0,
    error: null,
  };

  init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;

    // Configure auto-updater
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Event handlers
    autoUpdater.on('checking-for-update', () => {
      logger.info('Checking for updates...');
      this.updateStatus({ checking: true, error: null });
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      logger.info('Update available', { version: info.version });
      this.updateStatus({
        checking: false,
        available: true,
        version: info.version,
      });
      this.sendToRenderer('update:available', { version: info.version });
    });

    autoUpdater.on('update-not-available', () => {
      logger.info('No updates available');
      this.updateStatus({ checking: false, available: false });
    });

    autoUpdater.on('download-progress', (progress) => {
      this.updateStatus({
        downloading: true,
        progress: Math.round(progress.percent),
      });
      this.sendToRenderer('update:progress', { percent: progress.percent });
    });

    autoUpdater.on('update-downloaded', () => {
      logger.info('Update downloaded');
      this.updateStatus({
        downloading: false,
        downloaded: true,
        progress: 100,
      });
      this.sendToRenderer('update:ready', {});
    });

    autoUpdater.on('error', (error) => {
      // electron-updater embeds the whole HTTP response in the message, which
      // buries the actual cause. Keep the first line for the log.
      const message = firstLine(error.message);
      logger.error('Update error', { error: message });
      this.updateStatus({
        checking: false,
        downloading: false,
        error: message,
      });
    });
  }

  private updateStatus(partial: Partial<UpdateStatus>): void {
    this.status = { ...this.status, ...partial };
  }

  private sendToRenderer(channel: string, data: object): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }

  async checkForUpdates(): Promise<UpdateStatus> {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      const message = firstLine((error as Error).message);
      logger.error('Check for updates failed', { error: message });
      this.updateStatus({ checking: false, error: message });
    }
    return this.status;
  }

  async downloadUpdate(): Promise<void> {
    if (!this.status.available) {
      throw new Error('No update available');
    }
    this.updateStatus({ downloading: true, progress: 0 });
    await autoUpdater.downloadUpdate();
  }

  installUpdate(): void {
    if (!this.status.downloaded) {
      throw new Error('Update not downloaded');
    }
    autoUpdater.quitAndInstall(false, true);
  }

  getStatus(): UpdateStatus {
    return { ...this.status };
  }
}

// Singleton
let updateInstance: UpdateService | null = null;

export function getUpdateService(): UpdateService {
  if (!updateInstance) {
    updateInstance = new UpdateService();
  }
  return updateInstance;
}
