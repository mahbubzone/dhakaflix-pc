/**
 * Resolve assets for sample titles and report what was found.
 *
 * Usage: npx electron scripts/resolve-smoke.js [count]
 */

const path = require('path');
const { app } = require('electron');

const dist = path.join(__dirname, '..', 'dist', 'main');
const { initDatabase, closeDatabase, getDatabase } = require(path.join(dist, 'services', 'database.js'));
const { resolveAssets } = require(path.join(dist, 'services', 'media.js'));

// Keep this script on the same userData folder as `electron .`.
app.setName('dhakaflix-pc');

const count = Number(process.argv[2] || 3);

app.whenReady().then(async () => {
  try {
    await initDatabase();
    const db = getDatabase();

    const movies = db.prepare('SELECT id, title FROM movies ORDER BY id LIMIT ?').all(count);
    const series = db.prepare('SELECT id, title FROM movies WHERE kind = 1 ORDER BY id LIMIT 2').all();

    for (const m of [...movies, ...series]) {
      const started = Date.now();
      try {
        const r = await resolveAssets(m.id);
        console.log(`[${m.id}] ${m.title}`);
        console.log(`   video   : ${r.video ? path.basename(decodeURIComponent(new URL(r.video).pathname)) : 'NONE'}`);
        console.log(`   poster  : ${r.poster ? path.basename(decodeURIComponent(new URL(r.poster).pathname)) : 'NONE'}`);
        console.log(`   episodes: ${r.episodes} | cached=${r.cached} | ${Date.now() - started}ms`);
      } catch (error) {
        console.log(`[${m.id}] ${m.title} -> ERROR ${error.message}`);
      }
    }

    console.log('\n--- totals ---');
    console.log('with video :', db.prepare('SELECT COUNT(*) c FROM movies WHERE video IS NOT NULL').get().c);
    console.log('with poster:', db.prepare('SELECT COUNT(*) c FROM movies WHERE poster IS NOT NULL').get().c);
    console.log('episodes   :', db.prepare('SELECT COUNT(*) c FROM episodes').get().c);
  } catch (error) {
    console.error('FAILED:', error.stack || error.message);
    process.exitCode = 1;
  } finally {
    closeDatabase();
    app.quit();
  }
});
