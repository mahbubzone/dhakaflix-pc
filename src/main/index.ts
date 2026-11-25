/**
 * DhakaFlix PC — Main Process Entry
 * 
 * Responsibilities:
 * - Create application window
 * - Initialize services
 * - Register IPC handlers
 * - Handle app lifecycle
 */

import { app, BrowserWindow, shell, session } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase } from './services/database';
import { registerIpcHandlers } from './ipc';
import { getUpdateService } from './services/updater';
import { ensureDirectories } from './utils/paths';
import { logger } from './utils/logger';
import { config } from './services/config';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

/**
 * Content Security Policy.
 *
 * Applied as a response header rather than a meta tag so it also covers
 * documents loaded from the dev server. Media and poster images come from
 * ISP servers on the local network over plain HTTP, so http: is allowed for
 * img/media/connect only — never for scripts. Frames are restricted to the two
 * YouTube hosts used by the More Info trailer player.
 */
const FRAME_SRC = "frame-src https://www.youtube-nocookie.com https://www.youtube.com";

const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: http: https:",
  "media-src 'self' http: https:",
  "connect-src 'self' http: https:",
  "font-src 'self' data:",
  "object-src 'none'",
  FRAME_SRC,
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const CSP_DEV = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: http: https:",
  "media-src 'self' http: https:",
  "connect-src 'self' http: https: ws://localhost:5173 http://localhost:5173",
  "font-src 'self' data:",
  "object-src 'none'",
  FRAME_SRC,
].join('; ');

function applyContentSecurityPolicy(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // CSP is a document policy. Applying it to third-party subframes (the
    // YouTube trailer player) would replace YouTube's own CSP and stop the
    // player from loading its scripts, so only the top-level document gets it.
    if (details.resourceType !== 'mainFrame') {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [isDev ? CSP_DEV : CSP_PROD],
      },
    });
  });
}

/**
 * YouTube rejects embedded players with "Error 153" when the request has no
 * Referer. The renderer is loaded from file://, so every YouTube request is
 * sent without one. Supply a stable referer for the player hosts only.
 */
function applyEmbedReferer(): void {
  const youtubeHost = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\//i;
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    if (youtubeHost.test(details.url)) {
      // A youtube.com referer triggers Error 152 on nocookie embeds. Use the
      // same host as the iframe so the player loads its config normally.
      details.requestHeaders.Referer = 'https://www.youtube-nocookie.com/';
    }
    callback({ requestHeaders: details.requestHeaders });
  });
}

async function createWindow(): Promise<void> {
  // Get saved window bounds
  const bounds = config.get('windowBounds');

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 960,
    minHeight: 540,
    // Hidden native title bar with a thin colour-matched Window Controls
    // Overlay. Windows draws the buttons and keeps Snap layouts working.
    frame: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#08090c', symbolColor: '#9aa1ad', height: 16 },
    show: false,
    backgroundColor: '#141414',
    // The packaged exe carries the icon; this covers `electron .` in dev.
    icon: path.join(__dirname, '../../build/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });

  // Restore maximized state
  if (bounds.maximized) {
    mainWindow.maximize();
  }

  // Save window bounds on resize/move
  const saveBounds = () => {
    if (!mainWindow) return;
    const isMaximized = mainWindow.isMaximized();
    if (!isMaximized) {
      const [width, height] = mainWindow.getSize();
      const [x, y] = mainWindow.getPosition();
      config.set('windowBounds', { width, height, x, y, maximized: false });
    } else {
      config.set('windowBounds', { ...config.get('windowBounds'), maximized: true });
    }
  };

  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);
  mainWindow.on('maximize', saveBounds);
  mainWindow.on('unmaximize', saveBounds);

  // Load renderer
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Register IPC handlers
  registerIpcHandlers(mainWindow);

  // Initialize updater
  const updater = getUpdateService();
  updater.init(mainWindow);

  // Check for updates on startup (after a delay)
  if (!isDev) {
    setTimeout(() => {
      updater.check().catch((err) => {
        logger.warn('Update check failed', { error: err.message });
      });
    }, 5000);
  }
}

async function initialize(): Promise<void> {
  logger.info('Starting DhakaFlix', { version: app.getVersion() });

  // Ensure directories exist
  ensureDirectories();

  // Lock down the renderer before any content loads
  applyContentSecurityPolicy();
  applyEmbedReferer();

  // Initialize database
  await initDatabase();
  logger.info('Database initialized');

  // Create main window
  await createWindow();
  logger.info('Window created');
}

// App lifecycle
app.whenReady().then(initialize).catch((err) => {
  logger.error('Initialization failed', { error: err.message });
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  logger.info('Shutting down');
  closeDatabase();
});

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});
