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
  MetadataInput,
  Category,
  MovieWithProgress,
  TrendingKind,
} from '../../shared/types';
import { isValidMovieId } from '../utils/validation';
import { SET_WATCHED_SQL } from './progress';

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

/** SQLite has no ADD COLUMN IF NOT EXISTS; guard so a partial migration can resume. */
function addColumnIfMissing(
  database: Database.Database,
  table: string,
  column: string,
  definition: string
): void {
  const columns = database.pragma(`table_info(${table})`) as { name: string }[];
  if (columns.some((entry) => entry.name === column)) return;
  database.exec(`ALTER TABLE ${table} ADD COLUMN "${column}" ${definition}`);
}

export function runMigrations(database: Database.Database): void {
  const currentVersion = database.pragma('user_version', { simple: true }) as number;

  const migrations: {
    version: number;
    sql: string;
    after?: (database: Database.Database) => void;
  }[] = [
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
          ('Awards & TV Shows', 'http://172.16.50.10/DHAKA-FLIX-10/Awards%20%26%20TV%20Shows/', 'h5ai', 1);
      `,
    },
    {
      // v0.2.0: Cinemeta title logos. Existing databases keep their metadata.
      version: 2,
      sql: `ALTER TABLE metadata ADD COLUMN logo_url TEXT;`,
    },
    {
      // v0.3.0: Cinemeta trending catalog cache. Additive; no existing rows change.
      version: 3,
      sql: `
        CREATE TABLE IF NOT EXISTS trending_cache (
          kind TEXT PRIMARY KEY,
          payload TEXT NOT NULL,
          fetched_at INTEGER NOT NULL
        );
      `,
    },
    {
      // v0.4.0: drop the retired WWE source and fold its award/show categories
      // into the real Awards & TV Shows category. No-op when names already
      // match; no other movie rows or metadata are touched.
      version: 4,
      sql: `
        DELETE FROM sources WHERE name LIKE '%WWE%AEW%' OR base_url LIKE '%WWE%AEW%';
        UPDATE movies SET category = 'Awards & TV Shows'
        WHERE category IN ('# AWARDS', '# TV SPECIAL & SHOWS');
      `,
    },
    {
      // v0.2.1: user-curated watchlist. Additive; no existing rows change.
      version: 5,
      sql: `
        CREATE TABLE IF NOT EXISTS watchlist (
          movie_id INTEGER PRIMARY KEY REFERENCES movies(id) ON DELETE CASCADE,
          added_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `,
    },
    {
      // v0.3.0: More Info metadata fields and favorites. Additive only.
      // Cached positive hits are dropped so useMetadata refetches the new
      // extended fields; cached misses and all user rows stay untouched.
      version: 6,
      sql: `
        CREATE TABLE IF NOT EXISTS favorites (
          movie_id INTEGER PRIMARY KEY REFERENCES movies(id) ON DELETE CASCADE,
          added_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `,
      after: (db) => {
        addColumnIfMissing(db, 'metadata', 'cast', 'TEXT');
        addColumnIfMissing(db, 'metadata', 'director', 'TEXT');
        addColumnIfMissing(db, 'metadata', 'awards', 'TEXT');
        addColumnIfMissing(db, 'metadata', 'trailers', 'TEXT');
        // Only the metadata cache is invalidated. Progress, watchlist,
        // favorites and movies are never touched by this migration.
        db.exec("DELETE FROM metadata WHERE imdb_id <> ''");
      },
    },
  ];

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      database.exec(migration.sql);
      migration.after?.(database);
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
  excludeCategory?: string;
  kind?: number;
  sourceId?: number;
  sortBy?: 'added' | 'title' | 'year' | 'size';
  sortOrder?: 'asc' | 'desc';
}

export interface MovieWithMetadata extends Movie {
  metadata?: Metadata | null;
}

/** IPC-safe copy of a metadata row; absent columns become explicit nulls. */
export function toPlainMetadata(row: Partial<Metadata> | undefined | null): Metadata | null {
  if (!row) return null;
  return {
    id: row.id ?? 0,
    movie_id: row.movie_id ?? 0,
    imdb_id: row.imdb_id ?? null,
    title: row.title ?? null,
    plot: row.plot ?? null,
    rating: row.rating ?? null,
    runtime: row.runtime ?? null,
    genres: row.genres ?? null,
    poster_url: row.poster_url ?? null,
    backdrop_url: row.backdrop_url ?? null,
    logo_url: row.logo_url ?? null,
    cast: row.cast ?? null,
    director: row.director ?? null,
    awards: row.awards ?? null,
    trailers: row.trailers ?? null,
    fetched_at: row.fetched_at ?? 0,
  };
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

    // Metadata cache
    getMetadata: Database.Statement;
    upsertMetadata: Database.Statement;

    // Trending cache
    getTrendingCache: Database.Statement;
    upsertTrendingCache: Database.Statement;
    
    // Source queries
    getAllSources: Database.Statement;
    getSourceById: Database.Statement;
    getEnabledSources: Database.Statement;
    updateSourceScanTime: Database.Statement;
    
    // Progress queries
    getProgressByHref: Database.Statement;
    upsertProgress: Database.Statement;
    saveProgressByHref: Database.Statement;
    markWatched: Database.Statement;
    setWatched: Database.Statement;
    clearProgress: Database.Statement;

    // Watchlist queries
    addToWatchlist: Database.Statement;
    removeFromWatchlist: Database.Statement;
    isWatchlisted: Database.Statement;
    getWatchlistIds: Database.Statement;
    getWatchlistMovies: Database.Statement;
    getWatchlistCount: Database.Statement;

    // Favorites queries
    addToFavorites: Database.Statement;
    removeFromFavorites: Database.Statement;
    isFavorite: Database.Statement;
    getFavoriteIds: Database.Statement;
    getFavoriteCount: Database.Statement;

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
               meta.runtime, meta.genres, meta.poster_url, meta.backdrop_url,
               meta.logo_url, meta."cast", meta.director, meta.awards, meta.trailers,
               meta.fetched_at
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

      // Metadata cache. imdb_id = '' is a negative hit; expires after 24h.
      getMetadata: this.db.prepare(`
        SELECT * FROM metadata WHERE movie_id = ?
      `),

      upsertMetadata: this.db.prepare(`
        INSERT INTO metadata (movie_id, imdb_id, title, plot, rating, runtime,
                              genres, poster_url, backdrop_url, logo_url,
                              "cast", director, awards, trailers, fetched_at)
        VALUES (@movie_id, @imdb_id, @title, @plot, @rating, @runtime,
                @genres, @poster_url, @backdrop_url, @logo_url,
                @cast, @director, @awards, @trailers, strftime('%s', 'now'))
        ON CONFLICT(movie_id) DO UPDATE SET
          imdb_id = excluded.imdb_id,
          title = excluded.title,
          plot = excluded.plot,
          rating = excluded.rating,
          runtime = excluded.runtime,
          genres = excluded.genres,
          poster_url = excluded.poster_url,
          backdrop_url = excluded.backdrop_url,
          logo_url = excluded.logo_url,
          -- Extended fields are optional in the trending catalog; keep an
          -- existing rich value when the new payload omits it. Core fields
          -- still take every legitimate update.
          "cast" = COALESCE(excluded."cast", metadata."cast"),
          director = COALESCE(excluded.director, metadata.director),
          awards = COALESCE(excluded.awards, metadata.awards),
          trailers = COALESCE(excluded.trailers, metadata.trailers),
          fetched_at = excluded.fetched_at
      `),

      // Trending cache (one JSON payload per kind)
      getTrendingCache: this.db.prepare(`
        SELECT payload, fetched_at FROM trending_cache WHERE kind = ?
      `),

      upsertTrendingCache: this.db.prepare(`
        INSERT INTO trending_cache (kind, payload, fetched_at)
        VALUES (@kind, @payload, @fetched_at)
        ON CONFLICT(kind) DO UPDATE SET
          payload = excluded.payload,
          fetched_at = excluded.fetched_at
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
      
      // Tracked playback writes movie_id/episode_id directly and preserves
      // the existing watched flag on conflict.
      saveProgressByHref: this.db.prepare(`
        INSERT INTO progress (href, movie_id, episode_id, position, duration, updated_at)
        VALUES (?, ?, ?, ?, ?, strftime('%s', 'now'))
        ON CONFLICT(href) DO UPDATE SET
          movie_id = excluded.movie_id,
          episode_id = excluded.episode_id,
          position = excluded.position,
          duration = excluded.duration,
          updated_at = strftime('%s', 'now')
      `),

      markWatched: this.db.prepare(`
        UPDATE progress SET watched = 1, updated_at = strftime('%s', 'now')
        WHERE href = ?
      `),

      setWatched: this.db.prepare(SET_WATCHED_SQL),

      clearProgress: this.db.prepare(`DELETE FROM progress WHERE href = ?`),

      // Watchlist queries
      addToWatchlist: this.db.prepare(`
        INSERT OR IGNORE INTO watchlist (movie_id) VALUES (?)
      `),

      removeFromWatchlist: this.db.prepare(`
        DELETE FROM watchlist WHERE movie_id = ?
      `),

      isWatchlisted: this.db.prepare(`
        SELECT 1 FROM watchlist WHERE movie_id = ?
      `),

      getWatchlistIds: this.db.prepare(`
        SELECT movie_id FROM watchlist ORDER BY added_at DESC, movie_id DESC
      `),

      getWatchlistMovies: this.db.prepare(`
        SELECT m.* FROM watchlist w
        JOIN movies m ON m.id = w.movie_id
        ORDER BY w.added_at DESC, m.id DESC
        LIMIT ? OFFSET ?
      `),

      getWatchlistCount: this.db.prepare(`
        SELECT COUNT(*) as count FROM watchlist
      `),

      // Favorites queries
      addToFavorites: this.db.prepare(`
        INSERT OR IGNORE INTO favorites (movie_id) VALUES (?)
      `),

      removeFromFavorites: this.db.prepare(`
        DELETE FROM favorites WHERE movie_id = ?
      `),

      isFavorite: this.db.prepare(`
        SELECT 1 FROM favorites WHERE movie_id = ?
      `),

      getFavoriteIds: this.db.prepare(`
        SELECT movie_id FROM favorites ORDER BY added_at DESC, movie_id DESC
      `),

      getFavoriteCount: this.db.prepare(`
        SELECT COUNT(*) as count FROM favorites
      `),

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
      excludeCategory,
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
    if (excludeCategory !== undefined) {
      conditions.push('(category IS NULL OR category != ?)');
      params.push(excludeCategory);
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
      logo_url?: string;
      cast?: string;
      director?: string;
      awards?: string;
      trailers?: string;
      fetched_at?: number;
    }) | undefined;

    if (!row) return null;

    const {
      imdb_id, meta_title, plot, rating, runtime, genres, poster_url,
      backdrop_url, logo_url, cast, director, awards, trailers, fetched_at,
      ...movie
    } = row;

    const result: MovieWithMetadata = movie;

    if (imdb_id || meta_title || plot) {
      result.metadata = toPlainMetadata({
        id: 0,
        movie_id: movie.id,
        imdb_id, title: meta_title, plot, rating, runtime, genres,
        poster_url, backdrop_url, logo_url, cast, director, awards, trailers,
        fetched_at,
      });
    } else {
      result.metadata = null;
    }

    return result;
  }

  // ============================================================
  // Metadata Cache
  // ============================================================

  /** Returns the cached row, including the expiring imdb_id = '' miss sentinel. */
  getMetadata(movieId: number): Metadata | null {
    return toPlainMetadata(this.stmts.getMetadata.get(movieId) as Partial<Metadata> | undefined);
  }

  saveMetadata(movieId: number, data: MetadataInput): void {
    this.stmts.upsertMetadata.run({
      movie_id: movieId,
      imdb_id: data.imdb_id ?? null,
      title: data.title ?? null,
      plot: data.plot ?? null,
      rating: data.rating ?? null,
      runtime: data.runtime ?? null,
      genres: data.genres ?? null,
      poster_url: data.poster_url ?? null,
      backdrop_url: data.backdrop_url ?? null,
      logo_url: data.logo_url ?? null,
      cast: data.cast ?? null,
      director: data.director ?? null,
      awards: data.awards ?? null,
      trailers: data.trailers ?? null,
    });
  }

  // ============================================================
  // Trending Cache
  // ============================================================

  /** Returns the raw trending payload. `fetched_at` is in seconds. */
  getTrendingCache(kind: TrendingKind): { payload: string; fetchedAt: number } | null {
    const row = this.stmts.getTrendingCache.get(kind) as
      | { payload: string; fetched_at: number }
      | undefined;
    return row ? { payload: row.payload, fetchedAt: row.fetched_at } : null;
  }

  saveTrendingCache(kind: TrendingKind, payload: string, fetchedAt: number): void {
    this.stmts.upsertTrendingCache.run({ kind, payload, fetched_at: fetchedAt });
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
      WHERE p.episode_id IS NULL
        AND p.watched = 0 AND p.duration > 0 AND p.position > 0
        AND p.position < p.duration * 0.95
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

  /** Upsert used by tracked VLC playback; episode links are optional. */
  saveProgressByHref(
    href: string,
    movieId: number | null,
    position: number,
    duration: number,
    episodeId: number | null = null
  ): void {
    this.stmts.saveProgressByHref.run(href, movieId, episodeId, position, duration);
  }

  markWatched(href: string): void {
    this.stmts.markWatched.run(href);
  }

  /** Toggle the watched flag without touching a saved resume position. */
  setWatched(href: string, watched: 0 | 1): void {
    if (typeof href !== 'string' || !href.trim()) return;
    this.stmts.setWatched.run(href, href, watched);
  }

  clearProgress(href: string): void {
    this.stmts.clearProgress.run(href);
  }

  // ============================================================
  // Watchlist
  // ============================================================

  addToWatchlist(movieId: number): boolean {
    if (!isValidMovieId(movieId)) return false;
    const result = this.stmts.addToWatchlist.run(movieId);
    return result.changes > 0;
  }

  removeFromWatchlist(movieId: number): boolean {
    if (!isValidMovieId(movieId)) return false;
    return this.stmts.removeFromWatchlist.run(movieId).changes > 0;
  }

  isWatchlisted(movieId: number): boolean {
    if (!isValidMovieId(movieId)) return false;
    return this.stmts.isWatchlisted.get(movieId) !== undefined;
  }

  getWatchlistIds(): number[] {
    return (this.stmts.getWatchlistIds.all() as { movie_id: number }[]).map((row) => row.movie_id);
  }

  getWatchlistMovies(limit = 50, offset = 0): { movies: Movie[]; total: number } {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 500) : 50;
    const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;
    const movies = this.stmts.getWatchlistMovies.all(safeLimit, safeOffset) as Movie[];
    const { count: total } = this.stmts.getWatchlistCount.get() as { count: number };
    return { movies, total };
  }

  getWatchlistCount(): number {
    const { count } = this.stmts.getWatchlistCount.get() as { count: number };
    return count;
  }

  // ============================================================
  // Favorites
  // ============================================================

  addFavorite(movieId: number): boolean {
    if (!isValidMovieId(movieId)) return false;
    return this.stmts.addToFavorites.run(movieId).changes > 0;
  }

  removeFavorite(movieId: number): boolean {
    if (!isValidMovieId(movieId)) return false;
    return this.stmts.removeFromFavorites.run(movieId).changes > 0;
  }

  isFavorite(movieId: number): boolean {
    if (!isValidMovieId(movieId)) return false;
    return this.stmts.isFavorite.get(movieId) !== undefined;
  }

  toggleFavorite(movieId: number): boolean {
    if (!isValidMovieId(movieId)) return false;
    if (this.isFavorite(movieId)) {
      this.removeFavorite(movieId);
      return false;
    }
    this.addFavorite(movieId);
    return true;
  }

  getFavoriteIds(): number[] {
    return (this.stmts.getFavoriteIds.all() as { movie_id: number }[]).map((row) => row.movie_id);
  }

  getFavoriteCount(): number {
    const { count } = this.stmts.getFavoriteCount.get() as { count: number };
    return count;
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
