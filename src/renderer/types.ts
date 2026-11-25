/**
 * Renderer Type Definitions
 *
 * Single source of truth for renderer-side view models.
 * These mirror the rows returned by the main process IPC handlers.
 */

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
  kind: number;
  poster: string | null;
  video: string | null;
  size: number;
  added: number;
  seen: number;
}

export interface MovieWithProgress extends Movie {
  position: number;
  duration: number;
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
}

export interface Progress {
  position: number;
  duration: number;
  watched: number;
}

/** Real VLC status forwarded by the main process; null fields mean unknown. */
export interface PlayerProgress {
  movieId: number | null;
  href: string | null;
  position: number | null;
  duration: number | null;
  state: string | null;
}

/** Cinemeta cache row. imdb_id = '' is a cached miss, not usable metadata. */
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
  logo_url: string | null;
  fetched_at: number;
}

export interface MetadataResult {
  ok: boolean;
  data: Metadata | null;
  error: string | null;
}

/** A real Cinemeta trending title matched to a local library movie. */
export interface TrendingItem {
  movie: Movie;
  rank: number;
  rating: number | null;
}

export interface ScanStatus {
  running: boolean;
  sourceId: number | null;
  sourceName: string | null;
  phase: 'idle' | 'scanning' | 'indexing';
  scanned: number;
  discovered: number;
  currentPath: string | null;
}

export interface PlayerInfo {
  name: 'vlc' | 'potplayer';
  installed: boolean;
  path: string | null;
}

export interface CategoryCount {
  category: string;
  count: number;
}
