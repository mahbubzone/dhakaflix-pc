import Database from 'better-sqlite3';
import { DatabaseService, runMigrations } from '../main/services/database';

describe('metadata upsert preserves extended fields', () => {
  let db: Database.Database;
  let service: DatabaseService;
  let movieId: number;

  const base = {
    imdb_id: 'tt0000042',
    title: 'Example',
    plot: 'Old plot',
    rating: 6.5,
    runtime: 100,
    genres: '["Drama"]',
    poster_url: 'http://poster/old.jpg',
    backdrop_url: 'http://backdrop/old.jpg',
    logo_url: 'http://logo/old.png',
  };

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    db.prepare("INSERT INTO sources (name, base_url, format) VALUES ('Test', 'http://test/', 'unknown')").run();
    movieId = Number(db.prepare(`
      INSERT INTO movies (href, source_id, category, title, added)
      VALUES ('/example', 1, 'English Movies', 'Example', 1000)
    `).run().lastInsertRowid);
    service = new DatabaseService(db);
  });

  afterEach(() => db.close());

  it('keeps cast, director, awards and trailers when a catalog omits them', () => {
    service.saveMetadata(movieId, {
      ...base,
      cast: '["Jane Doe"]',
      director: '["John Roe"]',
      awards: 'Won 1 Oscar',
      trailers: '[{"youtubeId":"dQw4w9WgXcQ"}]',
    });

    service.saveMetadata(movieId, {
      ...base,
      plot: 'New plot',
      rating: 8.1,
      backdrop_url: 'http://backdrop/new.jpg',
      logo_url: 'http://logo/new.png',
    });

    expect(service.getMetadata(movieId)).toMatchObject({
      cast: '["Jane Doe"]',
      director: '["John Roe"]',
      awards: 'Won 1 Oscar',
      trailers: '[{"youtubeId":"dQw4w9WgXcQ"}]',
      plot: 'New plot',
      rating: 8.1,
      backdrop_url: 'http://backdrop/new.jpg',
      logo_url: 'http://logo/new.png',
    });
  });

  it('still accepts legitimate updates to all extended fields', () => {
    service.saveMetadata(movieId, {
      ...base,
      cast: '["Old"]',
      director: '["Old"]',
      awards: 'Old award',
      trailers: '[]',
    });
    service.saveMetadata(movieId, {
      ...base,
      cast: '["New"]',
      director: '["New Director"]',
      awards: 'New award',
      trailers: '[{"youtubeId":"abcdefghijk"}]',
    });
    expect(service.getMetadata(movieId)).toMatchObject({
      cast: '["New"]',
      director: '["New Director"]',
      awards: 'New award',
      trailers: '[{"youtubeId":"abcdefghijk"}]',
    });
  });
});
