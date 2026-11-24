/**
 * Delete all crawler state for one source so the next scan is a full rebuild.
 *
 * Usage: npx electron scripts/reset-source.js <sourceId>
 */

const path = require('path');
const { app } = require('electron');

const dist = path.join(__dirname, '..', 'dist', 'main');
const { initDatabase, closeDatabase, getDatabase } = require(path.join(dist, 'services', 'database.js'));

// Keep this script on the same userData folder as `electron .`.
app.setName('dhakaflix-pc');

const sourceId = Number(process.argv[2] || 1);

app.whenReady().then(async () => {
  try {
    await initDatabase();
    const db = getDatabase();

    const source = db.prepare('SELECT name FROM sources WHERE id = ?').get(sourceId);
    if (!source) throw new Error(`Source ${sourceId} not found`);

    const movies = db.prepare('DELETE FROM movies WHERE source_id = ?').run(sourceId).changes;
    const dirs = db.prepare('DELETE FROM dirs WHERE source_id = ?').run(sourceId).changes;
    db.prepare('UPDATE sources SET last_scan_at = NULL, last_scan_count = 0 WHERE id = ?').run(sourceId);

    console.log(`Reset ${source.name}: removed ${movies} movies, ${dirs} dir records`);
  } catch (error) {
    console.error('FAILED:', error.message);
    process.exitCode = 1;
  } finally {
    closeDatabase();
    app.quit();
  }
});
