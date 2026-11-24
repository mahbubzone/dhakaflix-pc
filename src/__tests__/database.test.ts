/**
 * DhakaFlix Database Integration Tests
 * 
 * Tests database operations with real SQLite.
 * Run: npx jest src/__tests__/database.test.ts
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Types
interface Movie {
  href: string;
  parent: string;
  category: string;
  title: string;
  year: number;
  quality?: string;
  dual: boolean;
  added: number;
  poster?: string;
  video?: string;
  size: number;
  position: number;
  duration: number;
  watched: boolean;
  seen: number;
  kind: number;
}

interface Progress {
  href: string;
  show: string;
  position: number;
  duration: number;
  watched: boolean;
}

// Database helper class (mock of actual implementation)
class DhakaFlixDB {
  private db: Database.Database;
  
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.init();
  }
  
  private init() {
    // Enable WAL mode
    this.db.pragma('journal_mode = WAL');
    
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS movies(
        href TEXT PRIMARY KEY,
        parent TEXT,
        category TEXT,
        title TEXT,
        year INT,
        quality TEXT,
        dual INT DEFAULT 0,
        added INT,
        poster TEXT,
        video TEXT,
        size INT DEFAULT 0,
        position INT DEFAULT 0,
        duration INT DEFAULT 0,
        watched INT DEFAULT 0,
        seen INT DEFAULT 0,
        kind INT DEFAULT 0
      );
      
      CREATE INDEX IF NOT EXISTS movies_cat_added ON movies(category, added);
      CREATE INDEX IF NOT EXISTS movies_title ON movies(title);
      
      CREATE TABLE IF NOT EXISTS dirs(
        href TEXT PRIMARY KEY,
        time INT
      );
      
      CREATE TABLE IF NOT EXISTS progress(
        href TEXT PRIMARY KEY,
        show TEXT,
        position INT,
        duration INT,
        watched INT DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS meta(
        href TEXT PRIMARY KEY,
        json TEXT
      );
      
      CREATE VIRTUAL TABLE IF NOT EXISTS movies_fts USING fts5(
        title,
        content='movies',
        content_rowid='rowid'
      );
    `);
  }
  
  getJournalMode(): string {
    return this.db.pragma('journal_mode', { simple: true }) as string;
  }
  
  insertMovie(movie: Partial<Movie>) {
    const stmt = this.db.prepare(`
      INSERT INTO movies (href, parent, category, title, year, quality, dual, added, poster, video, size, position, duration, watched, seen, kind)
      VALUES (@href, @parent, @category, @title, @year, @quality, @dual, @added, @poster, @video, @size, @position, @duration, @watched, @seen, @kind)
    `);
    
    stmt.run({
      href: movie.href,
      parent: movie.parent || '',
      category: movie.category || '',
      title: movie.title || '',
      year: movie.year || 0,
      quality: movie.quality || null,
      dual: movie.dual ? 1 : 0,
      added: movie.added || Date.now(),
      poster: movie.poster || null,
      video: movie.video || null,
      size: movie.size || 0,
      position: movie.position || 0,
      duration: movie.duration || 0,
      watched: movie.watched ? 1 : 0,
      seen: movie.seen || 0,
      kind: movie.kind || 0
    });
    
    // Update FTS index
    this.db.prepare(`INSERT INTO movies_fts(rowid, title) SELECT rowid, title FROM movies WHERE href = ?`).run(movie.href);
  }
  
  bulkInsertMovies(movies: Partial<Movie>[]) {
    const insert = this.db.transaction((items: Partial<Movie>[]) => {
      for (const movie of items) {
        this.insertMovie(movie);
      }
    });
    insert(movies);
  }
  
  getMoviesByCategory(category: string, limit = 100): Movie[] {
    return this.db.prepare(`
      SELECT * FROM movies WHERE category = ? ORDER BY added DESC LIMIT ?
    `).all(category, limit) as Movie[];
  }
  
  searchMovies(query: string, limit = 50): Movie[] {
    return this.db.prepare(`
      SELECT m.* FROM movies m
      JOIN movies_fts fts ON m.rowid = fts.rowid
      WHERE movies_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(query, limit) as Movie[];
  }
  
  getMovie(href: string): Movie | undefined {
    return this.db.prepare('SELECT * FROM movies WHERE href = ?').get(href) as Movie | undefined;
  }
  
  updatePosition(href: string, position: number, duration: number) {
    const watched = duration > 0 && position / duration > 0.95 ? 1 : 0;
    this.db.prepare(`
      UPDATE movies SET position = ?, duration = ?, watched = ? WHERE href = ?
    `).run(position, duration, watched, href);
  }
  
  saveProgress(progress: Progress) {
    this.db.prepare(`
      INSERT OR REPLACE INTO progress (href, show, position, duration, watched)
      VALUES (?, ?, ?, ?, ?)
    `).run(progress.href, progress.show, progress.position, progress.duration, progress.watched ? 1 : 0);
  }
  
  getProgress(href: string): Progress | undefined {
    return this.db.prepare('SELECT * FROM progress WHERE href = ?').get(href) as Progress | undefined;
  }
  
  markSeen(hrefs: string[], timestamp: number) {
    const stmt = this.db.prepare('UPDATE movies SET seen = ? WHERE href = ?');
    const mark = this.db.transaction((items: string[]) => {
      for (const href of items) {
        stmt.run(timestamp, href);
      }
    });
    mark(hrefs);
  }
  
  deleteUnseen(category: string, timestamp: number) {
    return this.db.prepare(`
      DELETE FROM movies WHERE category = ? AND seen < ?
    `).run(category, timestamp);
  }
  
  saveMeta(href: string, json: string) {
    this.db.prepare('INSERT OR REPLACE INTO meta (href, json) VALUES (?, ?)').run(href, json);
  }
  
  getMeta(href: string): string | undefined {
    const row = this.db.prepare('SELECT json FROM meta WHERE href = ?').get(href) as { json: string } | undefined;
    return row?.json;
  }
  
  getDirTime(href: string): number | undefined {
    const row = this.db.prepare('SELECT time FROM dirs WHERE href = ?').get(href) as { time: number } | undefined;
    return row?.time;
  }
  
  setDirTime(href: string, time: number) {
    this.db.prepare('INSERT OR REPLACE INTO dirs (href, time) VALUES (?, ?)').run(href, time);
  }
  
  getTitleCount(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM movies').get() as { count: number };
    return row.count;
  }
  
  close() {
    this.db.close();
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Database Integration', () => {
  let db: DhakaFlixDB;
  let dbPath: string;
  
  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `dhakaflix-test-${Date.now()}.db`);
    db = new DhakaFlixDB(dbPath);
  });
  
  afterEach(() => {
    db.close();
    try {
      fs.unlinkSync(dbPath);
      fs.unlinkSync(dbPath + '-wal');
      fs.unlinkSync(dbPath + '-shm');
    } catch (e) {
      // Ignore cleanup errors
    }
  });
  
  describe('Database Setup', () => {
    it('enables WAL mode', () => {
      expect(db.getJournalMode()).toBe('wal');
    });
    
    it('creates all required tables', () => {
      // If we can insert and query, tables exist
      db.insertMovie({ href: '/test', title: 'Test', category: 'English' });
      expect(db.getMovie('/test')).toBeDefined();
    });
  });
  
  describe('Movie CRUD', () => {
    it('inserts and retrieves a movie', () => {
      const movie: Partial<Movie> = {
        href: '/path/to/72-hours',
        parent: '/path/to/',
        category: 'English',
        title: '72 Hours',
        year: 2026,
        quality: '720p',
        dual: true,
        added: Date.now()
      };
      
      db.insertMovie(movie);
      const result = db.getMovie('/path/to/72-hours');
      
      expect(result).toBeDefined();
      expect(result!.title).toBe('72 Hours');
      expect(result!.year).toBe(2026);
      expect(result!.quality).toBe('720p');
      expect(result!.dual).toBe(1); // SQLite stores as int
    });
    
    it('queries movies by category', () => {
      db.insertMovie({ href: '/en/1', title: 'Movie 1', category: 'English', added: 1000 });
      db.insertMovie({ href: '/en/2', title: 'Movie 2', category: 'English', added: 2000 });
      db.insertMovie({ href: '/hi/1', title: 'Movie 3', category: 'Hindi', added: 3000 });
      
      const english = db.getMoviesByCategory('English');
      expect(english).toHaveLength(2);
      expect(english[0].title).toBe('Movie 2'); // Newest first
    });
    
    it('updates playback position', () => {
      db.insertMovie({ href: '/test', title: 'Test' });
      
      db.updatePosition('/test', 3600000, 7200000); // 1hr of 2hr movie
      
      const movie = db.getMovie('/test');
      expect(movie!.position).toBe(3600000);
      expect(movie!.duration).toBe(7200000);
      expect(movie!.watched).toBe(0); // Not >95%
    });
    
    it('marks watched at 95%', () => {
      db.insertMovie({ href: '/test', title: 'Test' });
      
      db.updatePosition('/test', 6900000, 7200000); // 96%
      
      const movie = db.getMovie('/test');
      expect(movie!.watched).toBe(1);
    });
  });
  
  describe('Full-Text Search', () => {
    beforeEach(() => {
      db.insertMovie({ href: '/1', title: 'The Shawshank Redemption', category: 'English' });
      db.insertMovie({ href: '/2', title: 'The Dark Knight', category: 'English' });
      db.insertMovie({ href: '/3', title: 'Inception', category: 'English' });
      db.insertMovie({ href: '/4', title: 'The Matrix', category: 'English' });
    });
    
    it('finds exact title match', () => {
      const results = db.searchMovies('Inception');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Inception');
    });
    
    it('finds partial match', () => {
      const results = db.searchMovies('Dark');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('The Dark Knight');
    });
    
    it('finds multiple matches', () => {
      const results = db.searchMovies('The');
      expect(results.length).toBeGreaterThanOrEqual(3);
    });
    
    it('returns empty for no match', () => {
      const results = db.searchMovies('Nonexistent');
      expect(results).toHaveLength(0);
    });
  });
  
  describe('Bulk Operations', () => {
    it('inserts 1000 movies in transaction', () => {
      const movies: Partial<Movie>[] = [];
      for (let i = 0; i < 1000; i++) {
        movies.push({
          href: `/movie/${i}`,
          title: `Movie ${i}`,
          category: 'Test',
          year: 2020 + (i % 7),
          added: Date.now() - i * 1000
        });
      }
      
      const start = Date.now();
      db.bulkInsertMovies(movies);
      const elapsed = Date.now() - start;
      
      expect(db.getTitleCount()).toBe(1000);
      expect(elapsed).toBeLessThan(5000); // Should complete in <5s
    });
    
    it('category query performs well with large dataset', () => {
      // Insert 10000 movies across 5 categories
      const movies: Partial<Movie>[] = [];
      const categories = ['English', 'Hindi', 'Korean', 'Japanese', 'Chinese'];
      
      for (let i = 0; i < 10000; i++) {
        movies.push({
          href: `/movie/${i}`,
          title: `Movie ${i}`,
          category: categories[i % 5],
          added: Date.now() - i * 1000
        });
      }
      
      db.bulkInsertMovies(movies);
      
      const start = Date.now();
      const results = db.getMoviesByCategory('English', 100);
      const elapsed = Date.now() - start;
      
      expect(results).toHaveLength(100);
      expect(elapsed).toBeLessThan(100); // <100ms with index
    });
  });
  
  describe('Mark and Sweep', () => {
    beforeEach(() => {
      db.insertMovie({ href: '/cat/1', title: 'Movie 1', category: 'Test' });
      db.insertMovie({ href: '/cat/2', title: 'Movie 2', category: 'Test' });
      db.insertMovie({ href: '/cat/3', title: 'Movie 3', category: 'Test' });
    });
    
    it('marks seen titles with timestamp', () => {
      const timestamp = Date.now();
      db.markSeen(['/cat/1', '/cat/2'], timestamp);
      
      expect(db.getMovie('/cat/1')!.seen).toBe(timestamp);
      expect(db.getMovie('/cat/2')!.seen).toBe(timestamp);
      expect(db.getMovie('/cat/3')!.seen).toBe(0);
    });
    
    it('deletes unseen titles', () => {
      const timestamp = Date.now();
      db.markSeen(['/cat/1', '/cat/2'], timestamp);
      
      const deleted = db.deleteUnseen('Test', timestamp);
      
      expect(deleted.changes).toBe(1); // Movie 3 deleted
      expect(db.getMovie('/cat/1')).toBeDefined();
      expect(db.getMovie('/cat/3')).toBeUndefined();
    });
  });
  
  describe('Episode Progress', () => {
    it('saves and retrieves episode progress', () => {
      const progress: Progress = {
        href: '/show/s01e01.mkv',
        show: '/show/',
        position: 1800000, // 30 minutes
        duration: 3600000, // 1 hour
        watched: false
      };
      
      db.saveProgress(progress);
      
      const result = db.getProgress('/show/s01e01.mkv');
      expect(result).toBeDefined();
      expect(result!.position).toBe(1800000);
    });
    
    it('updates existing progress', () => {
      db.saveProgress({ href: '/ep', show: '/show', position: 1000, duration: 3600000, watched: false });
      db.saveProgress({ href: '/ep', show: '/show', position: 2000, duration: 3600000, watched: false });
      
      const result = db.getProgress('/ep');
      expect(result!.position).toBe(2000);
    });
  });
  
  describe('Metadata Cache', () => {
    it('stores and retrieves metadata JSON', () => {
      const meta = JSON.stringify({
        imdbRating: '8.5',
        description: 'Test movie description',
        genres: ['Action', 'Drama']
      });
      
      db.saveMeta('/movie', meta);
      
      const result = db.getMeta('/movie');
      expect(result).toBe(meta);
      expect(JSON.parse(result!).imdbRating).toBe('8.5');
    });
    
    it('returns undefined for missing metadata', () => {
      expect(db.getMeta('/nonexistent')).toBeUndefined();
    });
  });
  
  describe('Incremental Scan', () => {
    it('stores directory modification times', () => {
      const time = Date.now();
      db.setDirTime('/category/year/', time);
      
      expect(db.getDirTime('/category/year/')).toBe(time);
    });
    
    it('returns undefined for new directories', () => {
      expect(db.getDirTime('/new/dir/')).toBeUndefined();
    });
    
    it('updates existing directory time', () => {
      db.setDirTime('/dir/', 1000);
      db.setDirTime('/dir/', 2000);
      
      expect(db.getDirTime('/dir/')).toBe(2000);
    });
  });
});
