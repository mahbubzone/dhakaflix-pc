/**
 * Database Service
 * 
 * SQLite database management using better-sqlite3.
 * WAL mode enabled for concurrent read/write.
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type {
  Movie,
  Episode,
  Source,
  Progress,
  Metadata,
  Category,
  MovieWithProgress,
} from '../../shared/types';

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'library.db');

  // Ensure directory exists
  fs.mkdirSync(userDataPath, { recursive: true });

  db = new Database(dbPath);

  // Enable WAL mode and optimizations
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');

  // Run migrations
  runMigrations(db);
}

function runMigrations(database: Database.Database): void {
  const currentVersion = database.pragma('user_version', { simple: true }) as number;

  const migrations = [
    {
      version: 1,
      sql: `
        -- Sources table
        CREATE TABLE IF NOT EXISTS sources (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          base_url TEXT NOT NULL UNIQUE,
          format TEXT CHECK(format IN ('h5ai', 'nginx', 'apache', 'unknown')),
          enabled INTEGER DEFAULT 1,
          last_scan_at INTEGER,
          last_scan_count INTEGER DEFAULT 0,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        -- Movies table
        CREATE TABLE IF NOT EXISTS movies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          href TEXT NOT NULL UNIQUE,
          parent TEXT,
          source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
          category TEXT,
          title TEXT NOT NULL,
          year INTEGER,
          quality TEXT,
          dual_audio INTEGER DEFAULT 0,
          kind INTEGER DEFAULT 0,
          poster TEXT,
          video TEXT,
          size INTEGER DEFAULT 0,
          added INTEGER DEFAULT (strftime('%s', 'now')),
          seen INTEGER DEFAULT 0,
          scan_id INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_movies_source ON movies(source_id);
        CREATE INDEX IF NOT EXISTS idx_movies_category_added ON movies(category, added DESC);
        CREATE INDEX IF NOT EXISTS idx_movies_kind ON movies(kind);

        -- FTS for search
        CREATE VIRTUAL TABLE IF NOT EXISTS movies_fts USING fts5(
          title,
          content='movies',
          content_rowid='id',
          tokenize='unicode61 remove_diacritics 2'
        );

        -- FTS sync triggers
        CREATE TRIGGER IF NOT EXISTS movies_ai AFTER INSERT ON movies BEGIN
          INSERT INTO movies_fts(rowid, title) VALUES (new.id, new.title);
        END;

        CREATE TRIGGER IF NOT EXISTS movies_ad AFTER DELETE ON movies BEGIN
          INSERT INTO movies_fts(movies_fts, rowid, title) VALUES('delete', old.id, old.title);
        END;

        CREATE TRIGGER IF NOT EXISTS movies_au AFTER UPDATE ON movies BEGIN
          INSERT INTO movies_fts(movies_fts, rowid, title) VALUES('delete', old.id, old.title);
          INSERT INTO movies_fts(rowid, title) VALUES (new.id, new.title);
        END;

        -- Episodes table
        CREATE TABLE IF NOT EXISTS episodes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
          href TEXT NOT NULL UNIQUE,
          season INTEGER NOT NULL,
          episode INTEGER NOT NULL,
          title TEXT,
          size INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_episodes_movie ON episodes(movie_id);

        -- Dirs table for incremental scan
        CREATE TABLE IF NOT EXISTS dirs (
          href TEXT PRIMARY KEY,
          source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
          mtime INTEGER NOT NULL
        );

        -- Progress table
        CREATE TABLE IF NOT EXISTS progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          href TEXT NOT NULL UNIQUE,
          movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
          episode_id INTEGER REFERENCES episodes(id) ON DELETE CASCADE,
          position INTEGER DEFAULT 0,
          duration INTEGER DEFAULT 0,
          watched INTEGER DEFAULT 0,
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE INDEX IF NOT EXISTS idx_progress_updated ON progress(updated_at DESC);

        -- Metadata cache
        CREATE TABLE IF NOT EXISTS metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          movie_id INTEGER NOT NULL UNIQUE REFERENCES movies(id) ON DELETE CASCADE,
          imdb_id TEXT,
          title TEXT,
          plot TEXT,
          rating REAL,
          runtime INTEGER,
          genres TEXT,
          poster_url TEXT,
          backdrop_url TEXT,
          fetched_at INTEGER DEFAULT (strftime('%s', 'now'))
        );

        -- Settings table
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        -- Insert DhakaFlix default sources
        INSERT OR IGNORE INTO sources (name, base_url, format, enabled) VALUES
          ('English Movies', 'http://172.16.50.7/DHAKA-FLIX-7/English%20Movies/', 'h5ai', 1),
          ('English Movies (1080p)', 'http://172.16.50.14/DHAKA-FLIX-14/English%20Movies%20%281080p%29/', 'h5ai', 1),
          ('Hindi Movies', 'http://172.16.50.14/DHAKA-FLIX-14/Hindi%20Movies/', 'h5ai', 1),
          ('South Indian Movies', 'http://172.16.50.14/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/South%20Movies/', 'h5ai', 1),
          ('South Movies (Hindi Dubbed)', 'http://172.16.50.14/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/Hindi%20Dubbed/', 'h5ai', 1),
          ('Kolkata Bangla Movies', 'http://172.16.50.7/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/', 'h5ai', 1),
          ('Animation Movies', 'http://172.16.50.14/DHAKA-FLIX-14/Animation%20Movies/', 'h5ai', 1),
          ('Animation Movies (1080p)', 'http://172.16.50.14/DHAKA-FLIX-14/Animation%20Movies%20%281080p%29/', 'h5ai', 1),
          ('Foreign Language Movies', 'http://172.16.50.7/DHAKA-FLIX-7/Foreign%20Language%20Movies/', 'h5ai', 1),
          ('IMDb Top-250 Movies', 'http://172.16.50.14/DHAKA-FLIX-14/IMDb%20Top-250%20Movies/', 'h5ai', 1),
          ('TV & Web Series', 'http://172.16.50.12/DHAKA-FLIX-12/TV-WEB-Series/', 'h5ai', 1),
          ('Korean TV & Web Series', 'http://172.16.50.14/DHAKA-FLIX-14/KOREAN%20TV%20%26%20WEB%20Series/', 'h5ai', 1),
          ('Cartoon TV Series', 'http://172.16.50.10/DHAKA-FLIX-10/Anime%20%26%20Cartoon%20TV%20Series/', 'h5ai', 1),
          ('Documentary', 'http://172.16.50.10/DHAKA-FLIX-10/Documentary/', 'h5ai', 1),
          ('WWE & AEW Wrestling', 'http://172.16.50.10/DHAKA-FLIX-10/WWE%20%26%20AEW%20Wrestling/', 'h5ai', 1),
          ('Awards & TV Shows', 'http://172.16.50.10/DHAKA-FLIX-10/Awards%20%26%20TV%20Shows/', 'h5ai', 1);
      `,
    },
  ];

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      database.exec(migration.sql);
      database.pragma(`user_version = ${migration.version}`);
    }
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ============================================================
// Query Layer Types
// ============================================================

export interface GetMoviesOptions {
  limit?: number;
  offset?: number;
  category?: string;
  kind?: number;
  sourceId?: number;
  sortBy?: 'added' | 'title' | 'year' | 'size';
  sortOrder?: 'asc' | 'desc';
}

export interface MovieWithMetadata extends Movie {
  metadata?: Metadata | null;
}

export interface InsertMovie {
  href: string;
  parent: string | null;
  source_id: number;
  category: string | null;
  title: string;
  year: number | null;
  quality: string | null;
  dual_audio: number;
  kind: number;
  poster: string | null;
  video: string | null;
  size: number;
  scan_id: number;
}

export interface InsertEpisode {
  movie_id: number;
  href: string;
  season: number;
  episode: number;
  title: string | null;
  size: number;
}

// ============================================================
// Database Service Class
// ============================================================

export class DatabaseService {
  private db: Database.Database;
  private stmts: {
    // Movie queries
    getMovieById: Database.Statement;
    getMovieByHref: Database.Statement;
    searchMovies: Database.Statement;
    
    // Source queries
    getAllSources: Database.Statement;
    getSourceById: Database.Statement;
    getEnabledSources: Database.Statement;
    updateSourceScanTime: Database.Statement;
    
    // Progress queries
    getProgressByHref: Database.Statement;
    upsertProgress: Database.Statement;
    markWatched: Database.Statement;
    clearProgress: Database.Statement;
    
    // Dir queries
    getDirMtime: Database.Statement;
    upsertDirMtime: Database.Statement;
    
    // Movie insert/delete
    insertMovie: Database.Statement;
    deleteMoviesByScanId: Database.Statement;
    getMaxScanId: Database.Statement;
    
    // Episode queries
    getEpisodesByMovieId: Database.Statement;
    insertEpisode: Database.Statement;
    
    // Category queries
    getCategories: Database.Statement;
    getCategoriesForSource: Database.Statement;
  };

  constructor(database: Database.Database) {
    this.db = database;
    this.stmts = this.prepareStatements();
  }

  private prepareStatements() {
    return {
      // Movie queries
      getMovieById: this.db.prepare(`
        SELECT m.*, meta.imdb_id, meta.title AS meta_title, meta.plot, meta.rating,
               meta.runtime, meta.genres, meta.poster_url, meta.backdrop_url, meta.fetched_at
        FROM movies m
        LEFT JOIN metadata meta ON m.id = meta.movie_id
        WHERE m.id = ?
      `),
      
      getMovieByHref: this.db.prepare(`
        SELECT * FROM movies WHERE href = ?
      `),
      
      searchMovies: this.db.prepare(`
        SELECT m.* FROM movies m
        JOIN movies_fts fts ON m.id = fts.rowid
        WHERE movies_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `),
      
      // Source queries
      getAllSources: this.db.prepare(`SELECT * FROM sources ORDER BY name`),
      
      getSourceById: this.db.prepare(`SELECT * FROM sources WHERE id = ?`),
      
      getEnabledSources: this.db.prepare(`
        SELECT * FROM sources WHERE enabled = 1 ORDER BY name
      `),
      
      updateSourceScanTime: this.db.prepare(`
        UPDATE sources 
        SET last_scan_at = strftime('%s', 'now'), last_scan_count = ?
        WHERE id = ?
      `),
      
      // Progress queries
      getProgressByHref: this.db.prepare(`SELECT * FROM progress WHERE href = ?`),
      
      upsertProgress: this.db.prepare(`
        INSERT INTO progress (href, movie_id, position, duration, updated_at)
        VALUES (?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(href) DO UPDATE SET
          position = excluded.position,
          duration = excluded.duration,
          updated_at = strftime('%s', 'now')
      `),
      
      markWatched: this.db.prepare(`
        UPDATE progress SET watched = 1, updated_at = strftime('%s', 'now')
        WHERE href = ?
      `),
      
      clearProgress: this.db.prepare(`DELETE FROM progress WHERE href = ?`),
      
      // Dir queries
      getDirMtime: this.db.prepare(`SELECT mtime FROM dirs WHERE href = ?`),
      
      upsertDirMtime: this.db.prepare(`
        INSERT INTO dirs (href, source_id, mtime) VALUES (?, ?, ?)
        ON CONFLICT(href) DO UPDATE SET mtime = excluded.mtime
      `),
      
      // Movie insert/delete
      insertMovie: this.db.prepare(`
        INSERT INTO movies (href, parent, source_id, category, title, year, quality,
                           dual_audio, kind, poster, video, size, scan_id)
        VALUES (@href, @parent, @source_id, @category, @title, @year, @quality,
                @dual_audio, @kind, @poster, @video, @size, @scan_id)
        ON CONFLICT(href) DO UPDATE SET
          title = excluded.title,
          year = excluded.year,
          quality = excluded.quality,
          dual_audio = excluded.dual_audio,
          kind = excluded.kind,
          poster = excluded.poster,
          video = excluded.video,
          size = excluded.size,
          scan_id = excluded.scan_id
      `),
      
      deleteMoviesByScanId: this.db.prepare(`
        DELETE FROM movies 
        WHERE source_id = ? AND (scan_id IS NULL OR scan_id < ?)
      `),
      
      getMaxScanId: this.db.prepare(`
        SELECT COALESCE(MAX(scan_id), 0) as max_scan_id FROM movies
      `),
      
      // Episode queries
      getEpisodesByMovieId: this.db.prepare(`
        SELECT * FROM episodes WHERE movie_id = ? ORDER BY season, episode
      `),
      
      insertEpisode: this.db.prepare(`
        INSERT INTO episodes (movie_id, href, season, episode, title, size)
        VALUES (@movie_id, @href, @season, @episode, @title, @size)
        ON CONFLICT(href) DO UPDATE SET
          season = excluded.season,
          episode = excluded.episode,
          title = excluded.title,
          size = excluded.size
      `),
      
      // Category queries
      getCategories: this.db.prepare(`
        SELECT category, COUNT(*) as count 
        FROM movies 
        WHERE category IS NOT NULL 
        GROUP BY category 
        ORDER BY count DESC
      `),
      
      getCategoriesForSource: this.db.prepare(`
        SELECT category, COUNT(*) as count 
        FROM movies 
        WHERE source_id = ? AND category IS NOT NULL 
        GROUP BY category 
        ORDER BY count DESC
      `),
    };
  }

  // ============================================================
  // Movie Queries
  // ============================================================

  getMovies(options: GetMoviesOptions = {}): { movies: Movie[]; total: number } {
    const {
      limit = 50,
      offset = 0,
      category,
      kind,
      sourceId,
      sortBy = 'added',
      sortOrder = 'desc',
    } = options;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (category !== undefined) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (kind !== undefined) {
      conditions.push('kind = ?');
      params.push(kind);
    }
    if (sourceId !== undefined) {
      conditions.push('source_id = ?');
      params.push(sourceId);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Validate sortBy and sortOrder
    const validSortColumns = ['added', 'title', 'year', 'size'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'added';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const countSql = `SELECT COUNT(*) as total FROM movies ${whereClause}`;
    const totalResult = this.db.prepare(countSql).get(...params) as { total: number };

    const selectSql = `
      SELECT * FROM movies 
      ${whereClause}
      ORDER BY ${sortColumn} ${order}
      LIMIT ? OFFSET ?
    `;
    const movies = this.db.prepare(selectSql).all(...params, limit, offset) as Movie[];

    return { movies, total: totalResult.total };
  }

  getMovie(id: number): MovieWithMetadata | null {
    const row = this.stmts.getMovieById.get(id) as (Movie & {
      imdb_id?: string;
      meta_title?: string;
      plot?: string;
      rating?: number;
      runtime?: number;
      genres?: string;
      poster_url?: string;
      backdrop_url?: string;
      fetched_at?: number;
    }) | undefined;

    if (!row) return null;

    const { imdb_id, meta_title, plot, rating, runtime, genres, poster_url, backdrop_url, fetched_at, ...movie } = row;

    const result: MovieWithMetadata = movie;
    
    if (imdb_id || meta_title || plot) {
      result.metadata = {
        id: 0,
        movie_id: movie.id,
        imdb_id: imdb_id ?? null,
        title: meta_title ?? null,
        plot: plot ?? null,
        rating: rating ?? null,
        runtime: runtime ?? null,
        genres: genres ?? null,
        poster_url: poster_url ?? null,
        backdrop_url: backdrop_url ?? null,
        fetched_at: fetched_at ?? 0,
      };
    } else {
      result.metadata = null;
    }

    return result;
  }

  searchMovies(query: string, limit = 50): Movie[] {
    if (!query.trim()) return [];
    
    // FTS5 query syntax: escape special chars and add prefix matching
    const sanitized = query.replace(/['"*]/g, '').trim();
    const ftsQuery = sanitized.split(/\s+/).map(term => `"${term}"*`).join(' ');
    
    try {
      return this.stmts.searchMovies.all(ftsQuery, limit) as Movie[];
    } catch {
      // Fallback to LIKE search if FTS fails
      const likeSql = `
        SELECT * FROM movies 
        WHERE title LIKE ? 
        ORDER BY added DESC 
        LIMIT ?
      `;
      return this.db.prepare(likeSql).all(`%${sanitized}%`, limit) as Movie[];
    }
  }

  getMovieByHref(href: string): Movie | null {
    return (this.stmts.getMovieByHref.get(href) as Movie) ?? null;
  }

  getContinueWatching(limit = 10): MovieWithProgress[] {
    const sql = `
      SELECT m.*, p.position, p.duration
      FROM movies m
      JOIN progress p ON m.id = p.movie_id
      WHERE p.watched = 0 AND p.position > 0 AND p.duration > 0
        AND (CAST(p.position AS REAL) / p.duration) < 0.95
      ORDER BY p.updated_at DESC
      LIMIT ?
    `;
    return this.db.prepare(sql).all(limit) as MovieWithProgress[];
  }

  getRecentlyAdded(limit = 20): Movie[] {
    const sql = `SELECT * FROM movies ORDER BY added DESC LIMIT ?`;
    return this.db.prepare(sql).all(limit) as Movie[];
  }

  // ============================================================
  // Source Queries
  // ============================================================

  getSources(): Source[] {
    return this.stmts.getAllSources.all() as Source[];
  }

  getSource(id: number): Source | null {
    return (this.stmts.getSourceById.get(id) as Source) ?? null;
  }

  getEnabledSources(): Source[] {
    return this.stmts.getEnabledSources.all() as Source[];
  }

  updateSourceScanTime(id: number, count: number): void {
    this.stmts.updateSourceScanTime.run(count, id);
  }

  // ============================================================
  // Progress Queries
  // ============================================================

  getProgress(href: string): Progress | null {
    return (this.stmts.getProgressByHref.get(href) as Progress) ?? null;
  }

  saveProgress(href: string, movieId: number | null, position: number, duration: number): void {
    this.stmts.upsertProgress.run(href, movieId, position, duration);
  }

  markWatched(href: string): void {
    this.stmts.markWatched.run(href);
  }

  clearProgress(href: string): void {
    this.stmts.clearProgress.run(href);
  }

  // ============================================================
  // Crawler Support
  // ============================================================

  getDirMtime(href: string): number | null {
    const row = this.stmts.getDirMtime.get(href) as { mtime: number } | undefined;
    return row?.mtime ?? null;
  }

  setDirMtime(href: string, sourceId: number, mtime: number): void {
    this.stmts.upsertDirMtime.run(href, sourceId, mtime);
  }

  insertMovie(movie: InsertMovie): number {
    const result = this.stmts.insertMovie.run(movie);
    return Number(result.lastInsertRowid);
  }

  insertMoviesBatch(movies: InsertMovie[]): number {
    if (movies.length === 0) return 0;

    const insertMany = this.db.transaction((items: InsertMovie[]) => {
      let count = 0;
      for (const movie of items) {
        this.stmts.insertMovie.run(movie);
        count++;
      }
      return count;
    });

    return insertMany(movies);
  }

  deleteMoviesByScanId(sourceId: number, scanId: number): number {
    const result = this.stmts.deleteMoviesByScanId.run(sourceId, scanId);
    return result.changes;
  }

  getNextScanId(): number {
    const row = this.stmts.getMaxScanId.get() as { max_scan_id: number };
    return row.max_scan_id + 1;
  }

  // ============================================================
  // Episode Queries
  // ============================================================

  getEpisodes(movieId: number): Episode[] {
    return this.stmts.getEpisodesByMovieId.all(movieId) as Episode[];
  }

  insertEpisode(episode: InsertEpisode): number {
    const result = this.stmts.insertEpisode.run(episode);
    return Number(result.lastInsertRowid);
  }

  insertEpisodesBatch(episodes: InsertEpisode[]): number {
    if (episodes.length === 0) return 0;

    const insertMany = this.db.transaction((items: InsertEpisode[]) => {
      let count = 0;
      for (const ep of items) {
        this.stmts.insertEpisode.run(ep);
        count++;
      }
      return count;
    });

    return insertMany(episodes);
  }

  // ============================================================
  // Category Queries
  // ============================================================

  getCategories(): Category[] {
    return this.stmts.getCategories.all() as Category[];
  }

  getCategoriesForSource(sourceId: number): Category[] {
    return this.stmts.getCategoriesForSource.all(sourceId) as Category[];
  }
}

// Singleton instance
let dbService: DatabaseService | null = null;

export function getDatabaseService(): DatabaseService {
  if (!dbService) {
    const database = getDatabase();
    dbService = new DatabaseService(database);
  }
  return dbService;
}
