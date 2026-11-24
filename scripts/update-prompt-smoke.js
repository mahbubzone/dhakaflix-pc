/**
 * Smoke-test the update prompt without a real download.
 *
 * Loads the real built renderer, emits update:available as electron-updater
 * would, then checks that the banner rendered with a Download action.
 */

const path = require('path');
const { app, BrowserWindow } = require('electron');

const dist = path.join(__dirname, '..', 'dist');
const { initDatabase, closeDatabase } = require(path.join(dist, 'main', 'services', 'database.js'));
const { registerIpcHandlers } = require(path.join(dist, 'main', 'ipc.js'));

app.setName('dhakaflix-pc');

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

  registerIpcHandlers(win);
  await win.loadFile(path.join(dist, 'renderer', 'index.html'));
  await new Promise((resolve) => setTimeout(resolve, 2500));

  win.webContents.send('update:available', { version: '0.1.1' });
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const state = await win.webContents.executeJavaScript(`(() => {
    const banner = document.querySelector('.update-banner');
    return {
      banner: !!banner,
      text: banner ? banner.textContent.replace(/\\s+/g, ' ').trim() : null,
      downloadButton: !!document.querySelector('.update-banner button'),
    };
  })()`);

  console.log(JSON.stringify(state, null, 2));

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
