/**
 * Scan every enabled source, sequentially.
 *
 * Usage: npx electron scripts/scan-all.js
 */

const path = require('path');
const { app } = require('electron');

const dist = path.join(__dirname, '..', 'dist', 'main');
const { initDatabase, closeDatabase, getDatabase } = require(path.join(dist, 'services', 'database.js'));
const { crawlerService } = require(path.join(dist, 'services', 'crawler.js'));

app.setName('dhakaflix-pc');

app.whenReady().then(async () => {
  const started = Date.now();
  try {
    await initDatabase();
    const db = getDatabase();

    const sources = db.prepare('SELECT id, name FROM sources WHERE enabled = 1 ORDER BY id').all();
    console.log(`Scanning ${sources.length} sources\n`);

    let failed = 0;
    for (const source of sources) {
      const t0 = Date.now();
      crawlerService.removeAllListeners('progress');
      crawlerService.removeAllListeners('error');

      let lastError = null;
      crawlerService.on('error', (message) => {
        lastError = message;
      });

      try {
        await crawlerService.startScan(source.id);
        const count = db.prepare('SELECT COUNT(*) c FROM movies WHERE source_id = ?').get(source.id).c;
        const secs = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(
          `${lastError ? 'FAIL' : '  ok'} ${String(source.id).padStart(2)} ${source.name.padEnd(34)} ` +
          `${String(count).padStart(6)} titles  ${secs}s${lastError ? '  ' + lastError : ''}`
        );
        if (lastError) failed++;
      } catch (error) {
        failed++;
        console.log(`FAIL ${source.id} ${source.name}: ${error.message}`);
      }
    }

    console.log('\n--- totals ---');
    console.log('movies    :', db.prepare('SELECT COUNT(*) c FROM movies').get().c);
    console.log('series    :', db.prepare('SELECT COUNT(*) c FROM movies WHERE kind = 1').get().c);
    console.log('categories:', db.prepare('SELECT COUNT(DISTINCT category) c FROM movies').get().c);
    console.log('failed    :', failed);
    console.log(`elapsed   : ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } catch (error) {
    console.error('FAILED:', error.stack || error.message);
    process.exitCode = 1;
  } finally {
    closeDatabase();
    app.quit();
  }
});
