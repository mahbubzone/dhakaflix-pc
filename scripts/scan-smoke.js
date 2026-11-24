/**
 * Headless scan smoke test.
 *
 * Runs the real crawler against one source and reports what landed in the
 * database. Usage:
 *   npx electron scripts/scan-smoke.js <sourceId>
 */

const path = require('path');
const { app } = require('electron');

const dist = path.join(__dirname, '..', 'dist', 'main');
const { initDatabase, closeDatabase, getDatabase } = require(path.join(dist, 'services', 'database.js'));
const { crawlerService } = require(path.join(dist, 'services', 'crawler.js'));

// Running `electron <script>` names the app "Electron", which would put the
// database in a different userData folder than `electron .` uses. Pin the name
// so scripts and the app share one database.
app.setName('dhakaflix-pc');

const sourceId = Number(process.argv[2] || 1);

app.whenReady().then(async () => {
  const started = Date.now();
  try {
    await initDatabase();
    const db = getDatabase();

    const source = db.prepare('SELECT id, name, base_url FROM sources WHERE id = ?').get(sourceId);
    if (!source) throw new Error(`Source ${sourceId} not found`);
    console.log(`Source: ${source.name} -> ${source.base_url}`);

    let lastScanned = 0;
    crawlerService.on('progress', (status) => {
      if (status.scanned - lastScanned >= 5 || status.phase === 'indexing') {
        lastScanned = status.scanned;
        console.log(`  [${status.phase}] dirs=${status.scanned} titles=${status.discovered}`);
      }
    });
    crawlerService.on('error', (err) => console.error('CRAWLER ERROR:', err));

    await crawlerService.startScan(sourceId);

    const movies = db.prepare('SELECT COUNT(*) c FROM movies WHERE source_id = ?').get(sourceId).c;
    console.log(`\nMovies in DB for source: ${movies}`);
    console.log('\n--- 8 sample rows ---');
    for (const m of db.prepare(
      'SELECT id, title, year, quality, dual_audio, kind, category FROM movies WHERE source_id = ? ORDER BY id LIMIT 8'
    ).all(sourceId)) {
      console.log(JSON.stringify(m));
    }
    console.log('\n--- category spread ---');
    for (const c of db.prepare(
      'SELECT category, COUNT(*) n FROM movies WHERE source_id = ? GROUP BY category ORDER BY n DESC'
    ).all(sourceId)) {
      console.log(`  ${c.category}: ${c.n}`);
    }
    console.log(`\nelapsed: ${((Date.now() - started) / 1000).toFixed(1)}s`);
  } catch (error) {
    console.error('FAILED:', error.stack || error.message);
    process.exitCode = 1;
  } finally {
    closeDatabase();
    app.quit();
  }
});
