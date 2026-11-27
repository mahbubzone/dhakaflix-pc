import Database from 'better-sqlite3';
import { DatabaseService, runMigrations } from '../main/services/database';

describe('clearing saved progress', () => {
  let db: Database.Database;
  let service: DatabaseService;
  const href = '/movie/resume.mkv';

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    db.prepare("INSERT INTO sources (name, base_url, format) VALUES ('Test', 'http://test/', 'unknown')").run();
    db.prepare('INSERT INTO movies (href, source_id, title, added) VALUES (?, 1, ?, 1000)')
      .run(href, 'Resume Me');
    service = new DatabaseService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('removes a title from Continue Watching and drops its saved position', () => {
    db.prepare(`
      INSERT INTO progress (href, movie_id, position, duration, watched)
      VALUES (?, 1, 1200, 3600, 0)
    `).run(href);

    expect(service.getContinueWatching(10).map((movie) => movie.href)).toContain(href);

    service.clearProgress(href);

    expect(service.getProgress(href)).toBeNull();
    expect(service.getContinueWatching(10).map((movie) => movie.href)).not.toContain(href);
  });

  it('ignores an unknown href without touching other progress rows', () => {
    const other = '/movie/keep.mkv';
    db.prepare('INSERT INTO movies (href, source_id, title, added) VALUES (?, 1, ?, 1000)')
      .run(other, 'Keep Me');
    db.prepare(`
      INSERT INTO progress (href, movie_id, position, duration, watched)
      VALUES (?, 1, 1200, 3600, 0), (?, 2, 600, 1800, 0)
    `).run(href, other);

    service.clearProgress('/movie/missing.mkv');

    expect(service.getProgress(href)).toMatchObject({ position: 1200 });
    expect(service.getProgress(other)).toMatchObject({ position: 600 });
  });
});
