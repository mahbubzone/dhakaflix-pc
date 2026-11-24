/**
 * Shared Type Definitions
 * 
 * Types used by both main and renderer processes.
 */

// ============================================================
// Database Models
// ============================================================

export interface Movie {
  id: number;
  href: string;
  parent: string | null;
  source_id: number;
  category: string | null;
  title: string;
  year: number | null;
  quality: string | null;
  dual_audio: number;
  kind: number; // 0=movie, 1=series
  poster: string | null;
  video: string | null;
  size: number;
  added: number;
  seen: number;
}

export interface Episode {
  id: number;
  movie_id: number;
  href: string;
  season: number;
  episode: number;
  title: string | null;
  size: number;
}

export interface Source {
  id: number;
  name: string;
  base_url: string;
  format: 'h5ai' | 'nginx' | 'apache' | 'unknown';
  enabled: number;
  last_scan_at: number | null;
  last_scan_count: number;
  created_at: number;
}

export interface Progress {
  id: number;
  href: string;
  movie_id: number | null;
  episode_id: number | null;
  position: number;
  duration: number;
  watched: number;
  updated_at: number;
}

export interface Metadata {
  id: number;
  movie_id: number;
  imdb_id: string | null;
  title: string | null;
  plot: string | null;
  rating: number | null;
  runtime: number | null;
  genres: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  fetched_at: number;
}

// ============================================================
// Crawler Types
// ============================================================

export interface ScanStatus {
  running: boolean;
  sourceId: number | null;
  sourceName: string | null;
  phase: 'idle' | 'scanning' | 'indexing';
  scanned: number;
  discovered: number;
  currentPath: string | null;
}

export interface ScanResult {
  sourceId: number;
  added: number;
  updated: number;
  removed: number;
  duration: number;
}

export interface DirectoryEntry {
  href: string;
  name: string;
  isDirectory: boolean;
  size: number;
  mtime: number;
}

export interface ParsedTitle {
  title: string;
  year: number;
  quality: string | null;
  dualAudio: boolean;
  kind: 'movie' | 'series' | 'event';
}

// ============================================================
// Player Types
// ============================================================

export interface PlayerInfo {
  name: 'vlc' | 'potplayer';
  installed: boolean;
  path: string | null;
}

export interface PlayOptions {
  startPosition?: number;
  title?: string;
  preferredPlayer?: 'vlc' | 'potplayer';
}

export interface PlayResult {
  launched: boolean;
  player: string | null;
  error?: string;
}

// ============================================================
// Settings Types
// ============================================================

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  preferredPlayer: 'vlc' | 'potplayer' | 'auto';
  autoScan: boolean;
  scanOnStartup: boolean;
  language: string;
}

// ============================================================
// API Types
// ============================================================

export interface Category {
  category: string;
  count: number;
}

export interface MovieWithProgress extends Movie {
  position: number;
  duration: number;
}

// ============================================================
// Error Types
// ============================================================

export type ErrorCode =
  | 'DB_ERROR'
  | 'NETWORK_ERROR'
  | 'PARSE_ERROR'
  | 'PLAYER_NOT_FOUND'
  | 'SOURCE_INVALID'
  | 'SCAN_FAILED'
  | 'UPDATE_FAILED'
  | 'UNKNOWN';

export interface AppErrorData {
  message: string;
  code: ErrorCode;
  recoverable: boolean;
}
