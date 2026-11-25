import Database from 'better-sqlite3';
import { DatabaseService, runMigrations, toPlainMetadata } from '../main/services/database';

describe('favorites and extended metadata', () => {
  let db: Database.Database;
  let service: DatabaseService;

  const insertMovie = (href: string, title: string): number => {
    const result = db.prepare(`
      INSERT INTO movies (href, source_id, category, title, added)
      VALUES (?, 1, 'English Movies', ?, 1000)
    `).run(href, title);
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

  it('migration v6 adds favorites and the four metadata columns', () => {
    expect(db.pragma('user_version', { simple: true })).toBe(6);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'favorites'").get())
      .toBeDefined();
    const columns = (db.pragma('table_info(metadata)') as { name: string }[]).map((column) => column.name);
    for (const name of ['cast', 'director', 'awards', 'trailers', 'backdrop_url', 'logo_url']) {
      expect(columns).toContain(name);
    }
  });

  it('preserves existing rows when a partially migrated database resumes', () => {
    const id = insertMovie('/old', 'Old Movie');
    service.saveMetadata(id, {
      imdb_id: 'tt0000001',
      title: 'Old Movie',
      plot: null,
      rating: null,
      runtime: null,
      genres: null,
      poster_url: null,
      backdrop_url: null,
      logo_url: null,
    });

    db.pragma('user_version = 5');
    expect(() => runMigrations(db)).not.toThrow();
    expect(db.pragma('user_version', { simple: true })).toBe(6);
    // v6 drops positive cached hits so extended fields are refetched.
    expect(service.getMetadata(id)).toBeNull();
  });

  it('persists and returns the new metadata fields as plain values', () => {
    const id = insertMovie('/movie', 'Movie');
    service.saveMetadata(id, {
      imdb_id: 'tt0000002',
      title: 'Movie',
      plot: 'Plot',
      rating: 7.5,
      runtime: 120,
      genres: '["Drama"]',
      poster_url: null,
      backdrop_url: null,
      logo_url: null,
      cast: '["Jane Doe"]',
      director: '["John Roe"]',
      awards: 'Won 1 Oscar',
      trailers: '[{"youtubeId":"dQw4w9WgXcQ","type":"Trailer"}]',
    });

    const row = service.getMetadata(id);
    expect(row).toEqual(expect.objectContaining({
      movie_id: id,
      cast: '["Jane Doe"]',
      director: '["John Roe"]',
      awards: 'Won 1 Oscar',
      trailers: '[{"youtubeId":"dQw4w9WgXcQ","type":"Trailer"}]',
    }));
    expect(Object.getPrototypeOf(row)).toBe(Object.prototype);
    expect(service.getMovie(id)?.metadata?.cast).toBe('["Jane Doe"]');

    service.saveMetadata(id, {
      imdb_id: 'tt0000002',
      title: 'Movie',
      plot: 'Plot',
      rating: 7.5,
      runtime: 120,
      genres: null,
      poster_url: null,
      backdrop_url: null,
      logo_url: null,
    });
    // Extended fields survive a catalog payload that omits them.
    expect(service.getMetadata(id)?.cast).toBe('["Jane Doe"]');
    expect(service.getMetadata(id)?.trailers)
      .toBe('[{"youtubeId":"dQw4w9WgXcQ","type":"Trailer"}]');
  });

  it('maps absent metadata columns to explicit nulls', () => {
    expect(toPlainMetadata({ id: 4, movie_id: 2 })).toEqual({
      id: 4,
      movie_id: 2,
      imdb_id: null,
      title: null,
      plot: null,
      rating: null,
      runtime: null,
      genres: null,
      poster_url: null,
      backdrop_url: null,
      logo_url: null,
      cast: null,
      director: null,
      awards: null,
      trailers: null,
      fetched_at: 0,
    });
    expect(toPlainMetadata(null)).toBeNull();
  });

  it('adds, checks, toggles, lists and removes favorites', () => {
    const first = insertMovie('/movie-1', 'Movie 1');
    const second = insertMovie('/movie-2', 'Movie 2');
    expect(service.isFavorite(first)).toBe(false);
    expect(service.addFavorite(first)).toBe(true);
    expect(service.addFavorite(first)).toBe(false);
    expect(service.isFavorite(first)).toBe(true);
    expect(service.getFavoriteCount()).toBe(1);

    expect(service.toggleFavorite(second)).toBe(true);
    expect(service.toggleFavorite(first)).toBe(false);
    expect(service.getFavoriteIds()).toEqual([second]);

    expect(service.removeFavorite(second)).toBe(true);
    expect(service.isFavorite(second)).toBe(false);
    expect(service.getFavoriteCount()).toBe(0);
  });

  it('keeps favorites independent from the watchlist', () => {
    const id = insertMovie('/movie', 'Movie');
    service.addToWatchlist(id);
    expect(service.isFavorite(id)).toBe(false);
    service.addFavorite(id);
    expect(service.isWatchlisted(id)).toBe(true);
    service.removeFromWatchlist(id);
    expect(service.isFavorite(id)).toBe(true);
  });

  it('rejects invalid ids and cascades movie deletes', () => {
    insertMovie('/movie', 'Movie');
    for (const invalid of [0, -1, 1.5, Number.NaN, '1']) {
      expect(service.addFavorite(invalid as number)).toBe(false);
      expect(service.removeFavorite(invalid as number)).toBe(false);
      expect(service.toggleFavorite(invalid as number)).toBe(false);
      expect(service.isFavorite(invalid as number)).toBe(false);
    }

    const id = insertMovie('/doomed', 'Doomed');
    service.addFavorite(id);
    db.prepare('DELETE FROM movies WHERE id = ?').run(id);
    expect(service.getFavoriteIds()).toEqual([]);
    expect(service.getFavoriteCount()).toBe(0);
  });
});
