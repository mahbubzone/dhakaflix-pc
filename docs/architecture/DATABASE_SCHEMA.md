# DhakaFlix PC — Database Schema

## Overview

- **Engine**: SQLite 3.x via better-sqlite3
- **Mode**: WAL (Write-Ahead Logging) for concurrent read/write
- **Location**: `%APPDATA%/DhakaFlix/library.db`

## Schema

### sources
ISP server configurations.

```sql
CREATE TABLE sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL UNIQUE,
  format TEXT CHECK(format IN ('h5ai', 'nginx', 'apache', 'unknown')),
  enabled INTEGER DEFAULT 1,
  last_scan_at INTEGER,
  last_scan_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

### movies
All discovered media (movies and series).

```sql
CREATE TABLE movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  href TEXT NOT NULL UNIQUE,
  parent TEXT,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  category TEXT,
  title TEXT NOT NULL,
  year INTEGER,
  quality TEXT,
  dual_audio INTEGER DEFAULT 0,
  kind INTEGER DEFAULT 0,  -- 0=movie, 1=series
  poster TEXT,
  video TEXT,
  size INTEGER DEFAULT 0,
  added INTEGER DEFAULT (strftime('%s', 'now')),
  seen INTEGER DEFAULT 0,
  scan_id INTEGER  -- For mark-and-sweep
);

CREATE INDEX idx_movies_source ON movies(source_id);
CREATE INDEX idx_movies_category_added ON movies(category, added DESC);
CREATE INDEX idx_movies_kind ON movies(kind);
CREATE INDEX idx_movies_scan ON movies(scan_id);
```

### movies_fts
Full-text search virtual table.

```sql
CREATE VIRTUAL TABLE movies_fts USING fts5(
  title,
  content='movies',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);

-- Sync triggers
CREATE TRIGGER movies_ai AFTER INSERT ON movies BEGIN
  INSERT INTO movies_fts(rowid, title) VALUES (new.id, new.title);
END;

CREATE TRIGGER movies_ad AFTER DELETE ON movies BEGIN
  INSERT INTO movies_fts(movies_fts, rowid, title) VALUES('delete', old.id, old.title);
END;

CREATE TRIGGER movies_au AFTER UPDATE ON movies BEGIN
  INSERT INTO movies_fts(movies_fts, rowid, title) VALUES('delete', old.id, old.title);
  INSERT INTO movies_fts(rowid, title) VALUES (new.id, new.title);
END;
```

### episodes
Episodes for TV series.

```sql
CREATE TABLE episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  href TEXT NOT NULL UNIQUE,
  season INTEGER NOT NULL,
  episode INTEGER NOT NULL,
  title TEXT,
  size INTEGER DEFAULT 0
);

CREATE INDEX idx_episodes_movie ON episodes(movie_id);
CREATE INDEX idx_episodes_order ON episodes(movie_id, season, episode);
```

### dirs
Directory modification times for incremental scanning.

```sql
CREATE TABLE dirs (
  href TEXT PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  mtime INTEGER NOT NULL
);
```

### progress
Playback progress tracking.

```sql
CREATE TABLE progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  href TEXT NOT NULL UNIQUE,
  movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,  -- seconds
  duration INTEGER DEFAULT 0,  -- seconds
  watched INTEGER DEFAULT 0,   -- 1 = completed
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_progress_movie ON progress(movie_id);
CREATE INDEX idx_progress_updated ON progress(updated_at DESC);
```

### metadata
Cached Cinemeta responses.

```sql
CREATE TABLE metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id INTEGER NOT NULL UNIQUE REFERENCES movies(id) ON DELETE CASCADE,
  imdb_id TEXT,
  title TEXT,
  plot TEXT,
  rating REAL,
  runtime INTEGER,
  genres TEXT,  -- JSON array
  poster_url TEXT,
  backdrop_url TEXT,
  fetched_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_metadata_imdb ON metadata(imdb_id);
```

### settings
Key-value application settings.

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

## Pragmas

Applied on database open:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = -64000;  -- 64MB
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;
```

## Migration Strategy

Migrations stored in `migrations/` folder, applied in order by version number.

```
migrations/
├── 001_initial.sql
├── 002_add_runtime.sql
└── ...
```

Migration runner:

```typescript
function migrate(db: Database) {
  const current = db.pragma('user_version', { simple: true }) as number;
  
  for (const file of fs.readdirSync('migrations').sort()) {
    const version = parseInt(file.split('_')[0]);
    if (version > current) {
      db.exec(fs.readFileSync(`migrations/${file}`, 'utf8'));
      db.pragma(`user_version = ${version}`);
    }
  }
}
```

## Queries

### Get movies by category (paginated)
```sql
SELECT m.*, meta.rating, meta.poster_url
FROM movies m
LEFT JOIN metadata meta ON meta.movie_id = m.id
WHERE m.category = ? AND m.kind = 0
ORDER BY m.added DESC
LIMIT ? OFFSET ?
```

### Search movies
```sql
SELECT m.*
FROM movies m
WHERE m.id IN (
  SELECT rowid FROM movies_fts WHERE movies_fts MATCH ?
)
ORDER BY m.added DESC
LIMIT ?
```

### Continue Watching
```sql
SELECT m.*, p.position, p.duration
FROM progress p
JOIN movies m ON m.id = p.movie_id
WHERE p.watched = 0 AND p.position > 0
ORDER BY p.updated_at DESC
LIMIT ?
```

### Mark and sweep (after scan)
```sql
DELETE FROM movies
WHERE source_id = ? AND scan_id != ?
```
