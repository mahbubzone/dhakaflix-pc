import Database from 'better-sqlite3';
import { DatabaseService, runMigrations } from '../main/services/database';

describe('getContinueWatching query', () => {
  let db: Database.Database;
  let service: DatabaseService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    db.prepare("INSERT INTO sources (name, base_url, format) VALUES ('Test', 'http://test/', 'unknown')").run();
    service = new DatabaseService(db);
  });

  afterEach(() => db.close());

  it('excludes episode, finished and near-watched rows', () => {
    const id = Number(db.prepare(`
      INSERT INTO movies (href, source_id, category, title, added)
      VALUES ('/movie-1', 1, 'English Movies', 'Movie 1', 1000)
    `).run().lastInsertRowid);
    const episodeId = Number(db.prepare(`
      INSERT INTO episodes (movie_id, href, season, episode, title, size)
      VALUES (?, '/movie-1/s01e01', 1, 1, 'Episode 1', 0)
    `).run(id).lastInsertRowid);

    const insertProgress = (href: string, episodeIdValue: number | null, position: number, duration: number, watched = 0) => {
      db.prepare(`
        INSERT INTO progress (href, movie_id, episode_id, position, duration, watched)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(href, id, episodeIdValue, position, duration, watched);
    };

    insertProgress('/movie-1', null, 30, 100);
    insertProgress('/movie-1/s01e01', episodeId, 50, 100);
    insertProgress('/movie-1/watched', null, 50, 100, 1);
    insertProgress('/movie-1/near-end', null, 96, 100);
    insertProgress('/movie-1/native-duration', null, 30, 0);

    expect(service.getContinueWatching(10).map((item) => item.href)).toEqual(['/movie-1']);
  });
});
