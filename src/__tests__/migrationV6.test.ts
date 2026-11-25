import Database from 'better-sqlite3';
import { runMigrations } from '../main/services/database';

describe('v6 migration metadata cache invalidation', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    db.prepare("INSERT INTO sources (name, base_url, format) VALUES ('Test', 'http://test/', 'unknown')").run();
    db.prepare(`
      INSERT INTO movies (href, source_id, category, title, added)
      VALUES ('/old', 1, 'English Movies', 'Old', 1000)
    `).run();
  });

  afterEach(() => db.close());

  const seedRows = (imdbId: string) => {
    db.prepare(`
      INSERT INTO metadata (movie_id, imdb_id, title, plot, rating, "cast", director, awards, trailers)
      VALUES (1, ?, 'Old', 'Old plot', 7.5, '["Jane"]', '["John"]', 'Won 1', '[]')
    `).run(imdbId);
    db.prepare('INSERT INTO progress (href, movie_id, position, duration, watched) VALUES (?, 1, 120, 300, 0)')
      .run('/progress');
    db.prepare('INSERT INTO watchlist (movie_id) VALUES (1)').run();
    db.prepare('INSERT INTO favorites (movie_id) VALUES (1)').run();
  };

  const count = (table: string): number => (
    db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }
  ).n;

  it('drops cached positive hits so extended fields get refetched', () => {
    seedRows('tt0000001');
    const before = {
      progress: count('progress'),
      watchlist: count('watchlist'),
      favorites: count('favorites'),
      movies: count('movies'),
    };

    db.pragma('user_version = 5');
    runMigrations(db);

    expect(db.pragma('user_version', { simple: true })).toBe(6);
    expect(count('metadata')).toBe(0);
    expect({
      progress: count('progress'),
      watchlist: count('watchlist'),
      favorites: count('favorites'),
      movies: count('movies'),
    }).toEqual(before);
  });

  it('keeps cached misses intact', () => {
    seedRows('');
    db.pragma('user_version = 5');
    runMigrations(db);
    expect(count('metadata')).toBe(1);
    expect(db.prepare('SELECT imdb_id FROM metadata').get()).toMatchObject({ imdb_id: '' });
  });
});
