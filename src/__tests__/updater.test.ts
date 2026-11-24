/**
 * Update Service Tests
 *
 * Verifies status reporting, event forwarding, and the download/install flow.
 * electron-updater is mocked, so no network call is made.
 */

import type { BrowserWindow } from 'electron';

jest.mock('electron-updater', () => ({
  autoUpdater: {
    autoDownload: true,
    autoInstallOnAppQuit: false,
    on: jest.fn(),
    checkForUpdates: jest.fn(),
    downloadUpdate: jest.fn(),
    quitAndInstall: jest.fn(),
  },
}));

jest.mock('../main/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

type Handler = (...args: any[]) => void;
type AutoUpdaterMock = {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  on: jest.Mock;
  checkForUpdates: jest.Mock;
  downloadUpdate: jest.Mock;
  quitAndInstall: jest.Mock;
};

describe('UpdateService', () => {
  let service: ReturnType<typeof import('../main/services/updater').getUpdateService>;
  let autoUpdaterMock: AutoUpdaterMock;
  let listeners: Map<string, Handler>;
  let fakeWindow: BrowserWindow & { webContents: { send: jest.Mock } };

  beforeEach(() => {
    jest.resetModules();
    autoUpdaterMock = require('electron-updater').autoUpdater as AutoUpdaterMock;
    listeners = new Map();
    autoUpdaterMock.on.mockImplementation((event: string, handler: Handler) => {
      listeners.set(event, handler);
    });

    const updaterModule = require('../main/services/updater') as typeof import('../main/services/updater');
    service = updaterModule.getUpdateService();
    fakeWindow = {
      isDestroyed: jest.fn(() => false),
      webContents: { send: jest.fn() },
    } as unknown as BrowserWindow & { webContents: { send: jest.Mock } };
    service.init(fakeWindow);
  });

  const emit = (event: string, ...args: unknown[]) => {
    const handler = listeners.get(event);
    if (!handler) throw new Error(`No handler for ${event}`);
    handler(...args);
  };

  it('keeps autoDownload off and forwards available updates', () => {
    expect(autoUpdaterMock.autoDownload).toBe(false);
    expect(autoUpdaterMock.autoInstallOnAppQuit).toBe(true);

    emit('update-available', { version: '9.9.9' });

    expect(service.getStatus()).toMatchObject({
      checking: false,
      available: true,
      version: '9.9.9',
    });
    expect(fakeWindow.webContents.send).toHaveBeenCalledWith('update:available', { version: '9.9.9' });
  });

  it('returns status from check and reports a failed check', async () => {
    autoUpdaterMock.checkForUpdates.mockResolvedValueOnce(undefined);
    const status = await service.check();
    expect(status).toHaveProperty('available', false);

    autoUpdaterMock.checkForUpdates.mockRejectedValueOnce(new Error('check failed\nHTTP 500'));
    const failed = await service.check();
    expect(failed.error).toBe('check failed');
  });

  it('refuses to download when no update is available', async () => {
    await expect(service.download()).rejects.toThrow('No update available');
  });

  it('stores and rethrows the error string when download fails', async () => {
    emit('update-available', { version: '9.9.9' });
    autoUpdaterMock.downloadUpdate.mockRejectedValueOnce(new Error('network down'));

    await expect(service.download()).rejects.toThrow('network down');
    expect(service.getStatus()).toMatchObject({
      downloading: false,
      error: 'network down',
      version: '9.9.9',
    });
  });

  it('downloads, marks the update ready, and installs on request', async () => {
    emit('update-available', { version: '9.9.9' });
    autoUpdaterMock.downloadUpdate.mockResolvedValueOnce(undefined);
    await service.download();
    expect(service.getStatus().downloading).toBe(true);

    emit('download-progress', { percent: 50 });
    expect(fakeWindow.webContents.send).toHaveBeenCalledWith('update:progress', { percent: 50 });

    emit('update-downloaded');
    expect(service.getStatus()).toMatchObject({ downloaded: true, progress: 100 });
    expect(fakeWindow.webContents.send).toHaveBeenCalledWith('update:ready', {});

    service.install();
    expect(autoUpdaterMock.quitAndInstall).toHaveBeenCalledWith(false, true);
  });

  it('refuses to install before the update is downloaded', () => {
    expect(() => service.install()).toThrow('Update not downloaded');
  });
});
