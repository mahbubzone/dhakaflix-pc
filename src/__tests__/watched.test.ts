import Database from 'better-sqlite3';
import { DatabaseService, runMigrations } from '../main/services/database';
import { normalizeWatchedFlag, SET_WATCHED_SQL } from '../main/services/progress';

describe('reversible watched state', () => {
  it('accepts only explicit 0 and 1 flags', () => {
    expect(normalizeWatchedFlag(0)).toBe(0);
    expect(normalizeWatchedFlag(1)).toBe(1);
    for (const invalid of [2, -1, true, '1', null, undefined, Number.NaN]) {
      expect(normalizeWatchedFlag(invalid)).toBeNull();
    }
  });

  it('writes the flag only and keeps saved progress on conflict', () => {
    expect(SET_WATCHED_SQL).toContain('watched = excluded.watched');
    expect(SET_WATCHED_SQL).toContain('position = progress.position');
    expect(SET_WATCHED_SQL).toContain('duration = progress.duration');
    expect(SET_WATCHED_SQL).toContain('episode_id = progress.episode_id');
    expect(SET_WATCHED_SQL).toContain('ON CONFLICT(href) DO UPDATE');
  });

  let db: Database.Database;
  let service: DatabaseService;
  const href = '/movie/watch.mkv';

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    db.prepare("INSERT INTO sources (name, base_url, format) VALUES ('Test', 'http://test/', 'unknown')").run();
    db.prepare(`
      INSERT INTO movies (href, source_id, title, added) VALUES (?, 1, 'Movie', 1000)
    `).run(href);
    service = new DatabaseService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('toggles watched without losing position, duration or episode', () => {
    const episode = db.prepare(`
      INSERT INTO episodes (movie_id, href, season, episode) VALUES (1, '/ep', 1, 1)
    `).run();
    db.prepare(`
      INSERT INTO progress (href, movie_id, episode_id, position, duration, watched)
      VALUES (?, 1, ?, 1200, 3600, 1)
    `).run(href, Number(episode.lastInsertRowid));

    service.setWatched(href, 0);
    let row = service.getProgress(href);
    expect(row).toMatchObject({ watched: 0, position: 1200, duration: 3600 });
    expect(row?.episode_id).toBe(Number(episode.lastInsertRowid));

    service.setWatched(href, 1);
    row = service.getProgress(href);
    expect(row).toMatchObject({ watched: 1, position: 1200, duration: 3600 });
    expect(row?.episode_id).toBe(Number(episode.lastInsertRowid));
  });

  it('creates a progress row when none exists', () => {
    service.setWatched('/new.mkv', 1);
    expect(service.getProgress('/new.mkv')).toMatchObject({
      watched: 1,
      position: 0,
      duration: 0,
      movie_id: null,
    });
  });

  it('leaves state unchanged for an empty href', () => {
    service.setWatched('   ', 1);
    expect(service.getProgress('   ')).toBeNull();
  });

  it('does not affect continue watching when toggling watched off', () => {
    db.prepare(`
      INSERT INTO progress (href, movie_id, position, duration, watched)
      VALUES (?, 1, 1200, 3600, 1)
    `).run(href);
    expect(service.getContinueWatching()).toHaveLength(0);
    service.setWatched(href, 0);
    expect(service.getContinueWatching()).toHaveLength(1);
  });
});
