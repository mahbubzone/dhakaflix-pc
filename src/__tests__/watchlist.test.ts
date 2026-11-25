import Database from 'better-sqlite3';
import { DatabaseService, runMigrations } from '../main/services/database';

describe('watchlist service', () => {
  let db: Database.Database;
  let service: DatabaseService;

  const insertMovie = (href: string, title: string, category = 'English Movies'): number => {
    const result = db.prepare(`
      INSERT INTO movies (href, source_id, category, title, added)
      VALUES (?, 1, ?, ?, ?)
    `).run(href, category, title, 1000);
    return Number(result.lastInsertRowid);
  };

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    db.prepare("INSERT INTO sources (name, base_url, format) VALUES ('Test', 'http://test/', 'unknown')").run();
    service = new DatabaseService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('migration v5 creates the watchlist table', () => {
    expect(db.pragma('user_version', { simple: true })).toBe(5);
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'watchlist'").get();
    expect(row).toBeDefined();
    // Re-running migrations on an existing database is a no-op.
    expect(() => runMigrations(db)).not.toThrow();
  });

  it('adds, checks, and removes entries', () => {
    const id = insertMovie('/movie-1', 'Movie 1');
    expect(service.isWatchlisted(id)).toBe(false);
    expect(service.addToWatchlist(id)).toBe(true);
    expect(service.isWatchlisted(id)).toBe(true);
    expect(service.addToWatchlist(id)).toBe(false); // duplicate ignored
    expect(service.getWatchlistCount()).toBe(1);
    expect(service.removeFromWatchlist(id)).toBe(true);
    expect(service.isWatchlisted(id)).toBe(false);
    expect(service.getWatchlistCount()).toBe(0);
  });

  it('lists ids newest first and paginates movies', () => {
    const first = insertMovie('/movie-1', 'Movie 1');
    const second = insertMovie('/movie-2', 'Movie 2');
    const third = insertMovie('/movie-3', 'Movie 3');
    for (const [index, id] of [first, second, third].entries()) {
      service.addToWatchlist(id);
      db.prepare('UPDATE watchlist SET added_at = ? WHERE movie_id = ?').run(100 + index, id);
    }

    expect(service.getWatchlistIds()).toEqual([third, second, first]);
    const page = service.getWatchlistMovies(1, 1);
    expect(page.total).toBe(3);
    expect(page.movies).toHaveLength(1);
    expect(page.movies[0].id).toBe(second);
  });

  it('rejects invalid ids without changing state', () => {
    insertMovie('/movie-1', 'Movie 1');
    for (const invalid of [0, -1, 1.5, Number.NaN, '1']) {
      expect(service.addToWatchlist(invalid as number)).toBe(false);
      expect(service.removeFromWatchlist(invalid as number)).toBe(false);
      expect(service.isWatchlisted(invalid as number)).toBe(false);
    }
    expect(service.getWatchlistCount()).toBe(0);
  });

  it('cascades deletes when a movie is removed', () => {
    const id = insertMovie('/movie-1', 'Movie 1');
    service.addToWatchlist(id);
    db.prepare('DELETE FROM movies WHERE id = ?').run(id);
    expect(service.getWatchlistIds()).toEqual([]);
    expect(service.getWatchlistCount()).toBe(0);
  });
});
