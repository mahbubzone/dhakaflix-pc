/**
 * Capture a screenshot of the real built renderer with live IPC + library data.
 *
 * Usage: npx electron scripts/app-shot.js
 * Output: local/demo/app-screenshot.png
 */

const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const dist = path.join(__dirname, '..', 'dist');
const { initDatabase, closeDatabase } = require(path.join(dist, 'main', 'services', 'database.js'));
const { registerIpcHandlers } = require(path.join(dist, 'main', 'ipc.js'));

app.setName('dhakaflix-pc');

const output = path.join(__dirname, '..', 'local', 'demo', 'app-screenshot.png');

async function run() {
  await initDatabase();

  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    show: false,
    backgroundColor: '#0d0d0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(dist, 'preload', 'index.js'),
    },
  });

  registerIpcHandlers(win);
  await win.loadFile(path.join(dist, 'renderer', 'index.html'));

  // Allow first render, IPC round trips, and lazy poster loading.
  await new Promise((resolve) => setTimeout(resolve, 8000));

  const image = await win.webContents.capturePage();
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, image.toPNG());
  console.log('saved', output, image.getSize());

  win.destroy();
  closeDatabase();
  app.quit();
}

app.whenReady()
  .then(run)
  .catch((error) => {
    console.error('SHOT FAILED:', error.stack || error.message);
    process.exitCode = 1;
    app.quit();
  });
