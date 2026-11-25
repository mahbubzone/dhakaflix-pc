/**
 * Renderer smoke test.
 *
 * Loads the built renderer in a hidden window with the real preload and IPC
 * handlers, then reports what actually rendered. Catches blank screens,
 * React crashes, and missing IPC handlers without a human looking at it.
 *
 * Usage: npx electron scripts/ui-smoke.js
 */

const path = require('path');
const { app, BrowserWindow } = require('electron');

const dist = path.join(__dirname, '..', 'dist');
const { initDatabase, closeDatabase } = require(path.join(dist, 'main', 'services', 'database.js'));
const { registerIpcHandlers } = require(path.join(dist, 'main', 'ipc.js'));

app.setName('dhakaflix-pc');

const consoleErrors = [];

async function run() {
  await initDatabase();

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(dist, 'preload', 'index.js'),
    },
  });

  win.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2) consoleErrors.push(message);
  });

  win.webContents.on('render-process-gone', (_e, details) => {
    consoleErrors.push('RENDERER GONE: ' + JSON.stringify(details));
  });

  registerIpcHandlers(win);

  await win.loadFile(path.join(dist, 'renderer', 'index.html'));

  // Give the first render, IPC round-trips, and poster resolution time.
  await new Promise((resolve) => setTimeout(resolve, 6000));

  const report = await win.webContents.executeJavaScript(`(() => {
    const text = (el) => (el ? el.textContent.trim() : null);
    return {
      title: document.title,
      hasSidebar: !!document.querySelector('.sidebar'),
      hasWindowControls: !!document.querySelector('.window-controls'),
      hasTitleBar: !!document.querySelector('.title-bar'),
      rows: Array.from(document.querySelectorAll('.poster-row__title')).map((e) => e.textContent.trim()),
      cards: document.querySelectorAll('.poster-card').length,
      posters: document.querySelectorAll('.poster-card__image.loaded').length,
      placeholders: document.querySelectorAll('.poster-card__placeholder').length,
      emptyState: text(document.querySelector('.home__empty-state')),
      loading: !!document.querySelector('.loading-spinner'),
      bodyText: (document.body.innerText || '').slice(0, 300),
    };
  })()`);

  console.log(JSON.stringify(report, null, 2));

  if (consoleErrors.length > 0) {
    console.log('\n--- renderer errors ---');
    for (const message of consoleErrors.slice(0, 10)) console.log('  ' + message);
  } else {
    console.log('\nno renderer errors');
  }

  win.destroy();
  closeDatabase();
  app.quit();
}

app.whenReady()
  .then(run)
  .catch((error) => {
    console.error('SMOKE FAILED:', error.stack || error.message);
    process.exitCode = 1;
    app.quit();
  });
