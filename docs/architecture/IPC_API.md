# DhakaFlix PC — IPC API Reference

## Overview

All communication between renderer and main process goes through typed IPC channels via `contextBridge`.

## API Structure

```typescript
// Exposed as window.api
interface DhakaFlixAPI {
  db: DatabaseAPI;
  crawler: CrawlerAPI;
  player: PlayerAPI;
  metadata: MetadataAPI;
  settings: SettingsAPI;
  app: AppAPI;
  window: WindowAPI;
}
```

## Database API

```typescript
interface DatabaseAPI {
  // Movies
  getMovies(options: {
    category?: string;
    kind?: 0 | 1;  // 0=movie, 1=series
    limit: number;
    offset: number;
    sortBy?: 'added' | 'title' | 'year' | 'rating';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ movies: Movie[]; total: number }>;
  
  getMovie(id: number): Promise<Movie | null>;
  
  searchMovies(query: string, limit?: number): Promise<Movie[]>;
  
  // Episodes
  getEpisodes(movieId: number): Promise<Episode[]>;
  
  // Progress
  getProgress(href: string): Promise<Progress | null>;
  
  getContinueWatching(limit: number): Promise<MovieWithProgress[]>;
  
  saveProgress(href: string, position: number, duration: number): Promise<void>;
  
  markWatched(href: string): Promise<void>;
  
  clearProgress(href: string): Promise<void>;
  
  // Categories
  getCategories(): Promise<Category[]>;
}
```

## Crawler API

```typescript
interface CrawlerAPI {
  // Control
  startScan(sourceId?: number): Promise<void>;
  
  stopScan(): Promise<void>;
  
  getScanStatus(): Promise<ScanStatus>;
  
  // Events (returns cleanup function)
  onScanProgress(callback: (status: ScanStatus) => void): () => void;
  
  onScanComplete(callback: (result: ScanResult) => void): () => void;
  
  onScanError(callback: (error: string) => void): () => void;
}

interface ScanStatus {
  running: boolean;
  sourceId: number | null;
  sourceName: string | null;
  phase: 'idle' | 'scanning' | 'indexing';
  scanned: number;
  discovered: number;
  currentPath: string | null;
}

interface ScanResult {
  sourceId: number;
  added: number;
  updated: number;
  removed: number;
  duration: number;
}
```

## Player API

```typescript
interface PlayerAPI {
  // Detection
  getAvailablePlayers(): Promise<PlayerInfo[]>;
  
  // Playback
  play(url: string, options?: {
    startPosition?: number;  // seconds
    title?: string;
    preferredPlayer?: 'vlc' | 'potplayer';
  }): Promise<{ launched: boolean; player: string | null; error?: string }>;
  
  // External links
  openPlayerDownload(player: 'vlc' | 'potplayer'): Promise<void>;
}

interface PlayerInfo {
  name: 'vlc' | 'potplayer';
  installed: boolean;
  path: string | null;
  version: string | null;
}
```

## Metadata API

```typescript
interface MetadataAPI {
  // Fetch for single movie
  fetchMetadata(movieId: number): Promise<Metadata | null>;
  
  // Batch fetch (background)
  fetchMissingMetadata(limit?: number): Promise<void>;
  
  // Events
  onMetadataUpdated(callback: (movieId: number) => void): () => void;
}

interface Metadata {
  imdbId: string | null;
  title: string;
  plot: string | null;
  rating: number | null;
  runtime: number | null;
  genres: string[];
  posterUrl: string | null;
  backdropUrl: string | null;
}
```

## Settings API

```typescript
interface SettingsAPI {
  // Sources
  getSources(): Promise<Source[]>;
  
  addSource(source: { name: string; baseUrl: string }): Promise<Source>;
  
  updateSource(id: number, updates: Partial<Source>): Promise<void>;
  
  removeSource(id: number): Promise<void>;
  
  testSource(baseUrl: string): Promise<{
    ok: boolean;
    format: 'h5ai' | 'nginx' | 'apache' | null;
    error?: string;
  }>;
  
  // Preferences
  getSettings(): Promise<Settings>;
  
  saveSettings(settings: Partial<Settings>): Promise<void>;
}

interface Source {
  id: number;
  name: string;
  baseUrl: string;
  format: 'h5ai' | 'nginx' | 'apache' | 'unknown';
  enabled: boolean;
  lastScanAt: number | null;
}

interface Settings {
  theme: 'dark' | 'light' | 'system';
  preferredPlayer: 'vlc' | 'potplayer' | 'auto';
  autoScan: boolean;
  scanOnStartup: boolean;
  language: string;
}
```

## App API

```typescript
interface AppAPI {
  getVersion(): Promise<string>;
  
  checkForUpdates(): Promise<{
    available: boolean;
    version?: string;
    releaseNotes?: string;
  }>;
  
  downloadUpdate(): Promise<void>;
  
  installUpdate(): Promise<void>;  // Quits and installs
  
  onUpdateProgress(callback: (percent: number) => void): () => void;
  
  onUpdateReady(callback: () => void): () => void;
  
  openLogsFolder(): Promise<void>;
  
  openDataFolder(): Promise<void>;
}
```

## Window API

```typescript
interface WindowAPI {
  minimize(): void;
  
  maximize(): void;
  
  close(): void;
  
  isMaximized(): Promise<boolean>;
  
  onMaximizeChange(callback: (maximized: boolean) => void): () => void;
}
```

## Error Handling

All async methods may throw `AppError`:

```typescript
class AppError extends Error {
  code: string;
  recoverable: boolean;
}

// Error codes
type ErrorCode =
  | 'DB_ERROR'
  | 'NETWORK_ERROR'
  | 'PARSE_ERROR'
  | 'PLAYER_NOT_FOUND'
  | 'SOURCE_INVALID'
  | 'SCAN_FAILED'
  | 'UPDATE_FAILED'
  | 'UNKNOWN';
```

## Event Listener Pattern

All `on*` methods return a cleanup function:

```typescript
// Usage in React
useEffect(() => {
  const cleanup = window.api.crawler.onScanProgress((status) => {
    setProgress(status);
  });
  
  return cleanup;  // Automatically unsubscribe on unmount
}, []);
```

## Preload Implementation

```typescript
// preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  db: {
    getMovies: (opts) => ipcRenderer.invoke('db:getMovies', opts),
    getMovie: (id) => ipcRenderer.invoke('db:getMovie', id),
    searchMovies: (q, limit) => ipcRenderer.invoke('db:search', q, limit),
    // ...
  },
  crawler: {
    startScan: (sourceId) => ipcRenderer.invoke('crawler:start', sourceId),
    onScanProgress: (cb) => {
      const handler = (_, status) => cb(status);
      ipcRenderer.on('crawler:progress', handler);
      return () => ipcRenderer.removeListener('crawler:progress', handler);
    },
    // ...
  },
  // ...
});
```
