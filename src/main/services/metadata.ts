/**
 * Metadata Service
 * 
 * Fetches movie/series metadata from Cinemeta (Stremio's free API).
 */

import { fetchJson, Semaphore } from '../utils/http';
import { logger } from '../utils/logger';
import { getDatabaseService } from './database';
import type { Metadata, MetadataInput } from '../../shared/types';

const CINEMETA_BASE = 'https://v3-cinemeta.strem.io';

/**
 * At most two Cinemeta lookups at once. `fetchWithRetry` uses the global
 * fetch, which follows the 307 redirects Cinemeta sends for new titles.
 */
const limiter = new Semaphore(2);

/** Misses expire so a transient offline lookup cannot suppress metadata forever. */
export const NEGATIVE_CACHE_TTL_SECONDS = 24 * 60 * 60;

export interface CinemetaSearchResult {
  id: string;
  type: 'movie' | 'series';
  name: string;
  releaseInfo?: string;
  poster?: string;
}

export interface CinemetaMeta {
  id: string;
  type: 'movie' | 'series';
  name: string;
  year?: number;
  description?: string;
  runtime?: string;
  genres?: string[];
  cast?: string[];
  director?: string[];
  imdbRating?: string;
  poster?: string;
  background?: string;
  logo?: string;
  videos?: CinemetaVideo[];
}

export interface CinemetaVideo {
  id: string;
  title: string;
  season?: number;
  episode?: number;
  released?: string;
  overview?: string;
  thumbnail?: string;
}

/**
 * Search for a movie or series by title
 */
export async function searchCinemeta(
  title: string,
  type: 'movie' | 'series' = 'movie'
): Promise<CinemetaSearchResult[]> {
  try {
    // Clean title for search
    const cleanTitle = title
      .replace(/^\d{3}\.\s+/, '') // Remove rank prefix
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const url = `${CINEMETA_BASE}/catalog/${type}/top/search=${encodeURIComponent(cleanTitle)}.json`;
    
    const response = await fetchJson<{ metas?: CinemetaSearchResult[] }>(url, {
      timeout: 10000,
      retries: 1,
    });

    return response.metas || [];
  } catch (error) {
    logger.warn('Cinemeta search failed', { title, error: (error as Error).message });
    return [];
  }
}

/**
 * Get detailed metadata for a specific title by IMDb ID
 */
export async function getCinemetaMeta(
  imdbId: string,
  type: 'movie' | 'series' = 'movie'
): Promise<CinemetaMeta | null> {
  try {
    const url = `${CINEMETA_BASE}/meta/${type}/${imdbId}.json`;
    
    const response = await fetchJson<{ meta?: CinemetaMeta }>(url, {
      timeout: 10000,
      retries: 1,
    });

    return response.meta || null;
  } catch (error) {
    logger.warn('Cinemeta meta fetch failed', { imdbId, error: (error as Error).message });
    return null;
  }
}

/**
 * Pick a Cinemeta search result by year. With a numeric year, only results
 * within +/-1 qualify; a title-only match is never accepted. Without a year,
 * the first result is the best available guess.
 */
export function findMatchingCinemetaResult<T extends { releaseInfo?: string }>(
  results: readonly T[],
  year: number | null
): T | null {
  if (results.length === 0) return null;
  if (typeof year !== 'number' || !Number.isFinite(year)) return results[0];

  return results.find((result) => {
    const releaseYear = result.releaseInfo?.match(/^\d{4}/)?.[0];
    return Boolean(releaseYear) && Math.abs(Number.parseInt(releaseYear!, 10) - year) <= 1;
  }) ?? null;
}

/**
 * Find best match for a movie by title and year.
 * A year mismatch returns null so the caller can cache a miss, not wrong data.
 */
export async function findMovieMetadata(
  title: string,
  year: number | null,
  type: 'movie' | 'series' = 'movie'
): Promise<CinemetaMeta | null> {
  const results = await searchCinemeta(title, type);
  const bestMatch = findMatchingCinemetaResult(results, year);
  if (!bestMatch) return null;

  return getCinemetaMeta(bestMatch.id, type);
}

/**
 * Parse runtime string to minutes
 * Examples: "2h 30min", "150 min", "2:30"
 */
export function parseRuntime(runtime?: string): number | null {
  if (!runtime) return null;

  // Try "Xh Ymin" format
  const hhmm = runtime.match(/(\d+)\s*h(?:\s*(\d+)\s*min)?/i);
  if (hhmm) {
    const hours = parseInt(hhmm[1]) || 0;
    const mins = parseInt(hhmm[2]) || 0;
    return hours * 60 + mins;
  }

  // Try "X min" format
  const mins = runtime.match(/(\d+)\s*min/i);
  if (mins) {
    return parseInt(mins[1]);
  }

  // Try "H:MM" format
  const colon = runtime.match(/(\d+):(\d{2})/);
  if (colon) {
    return parseInt(colon[1]) * 60 + parseInt(colon[2]);
  }

  return null;
}

/** Cinemeta ratings are strings such as "7.8"; store a number or nothing. */
export function parseRating(rating?: string): number | null {
  if (!rating) return null;
  const value = Number.parseFloat(rating);
  return Number.isFinite(value) ? value : null;
}

/** True while a cached miss is still fresh. Successful rows never expire. */
export function isFreshNegativeCache(
  metadata: Metadata | null | undefined,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  if (!metadata || metadata.imdb_id !== '') return false;
  const fetchedAt = metadata.fetched_at;
  if (typeof fetchedAt !== 'number' || !Number.isFinite(fetchedAt)) return false;
  return nowSeconds - fetchedAt < NEGATIVE_CACHE_TTL_SECONDS;
}

/**
 * Map a Cinemeta detail response onto the metadata table columns.
 * A null response becomes a negative-cache row: imdb_id = '' and no other
 * fields. Misses expire after 24h; successful rows are cached forever.
 */
export function normalizeCinemetaMeta(meta: CinemetaMeta | null): MetadataInput {
  if (!meta) {
    return {
      imdb_id: '',
      title: null,
      plot: null,
      rating: null,
      runtime: null,
      genres: null,
      poster_url: null,
      backdrop_url: null,
      logo_url: null,
    };
  }

  return {
    imdb_id: meta.id || '',
    title: meta.name || null,
    plot: meta.description || null,
    rating: parseRating(meta.imdbRating),
    runtime: parseRuntime(meta.runtime),
    genres: meta.genres?.length ? JSON.stringify(meta.genres) : null,
    poster_url: meta.poster || null,
    backdrop_url: meta.background || null,
    logo_url: meta.logo || null,
  };
}

/** One request per movie at a time; repeated mounts share the same lookup. */
const inflight = new Map<number, Promise<Metadata>>();

async function lookupMetadata(movieId: number): Promise<Metadata> {
  const db = getDatabaseService();

  // Successful rows are permanent; imdb_id = '' misses expire after 24h.
  const cached = db.getMetadata(movieId);
  if (cached && (cached.imdb_id !== '' || isFreshNegativeCache(cached))) return cached;

  const movie = db.getMovie(movieId);
  if (!movie) throw new Error(`Movie ${movieId} not found`);

  const imdbOrSeries = movie.kind === 1 ? 'series' : 'movie';
  const result = await findMovieMetadata(movie.title, movie.year, imdbOrSeries);
  db.saveMetadata(movieId, normalizeCinemetaMeta(result));

  const saved = db.getMetadata(movieId);
  if (!saved) throw new Error(`Failed to cache metadata for movie ${movieId}`);
  return saved;
}

/**
 * Return cached metadata, or fetch it once from Cinemeta and cache it forever.
 * Never called in bulk: only the focused hero/detail title uses this path.
 */
export function fetchMetadataForMovie(movieId: number): Promise<Metadata> {
  const pending = inflight.get(movieId);
  if (pending) return pending;

  const request = limiter
    .withPermit(() => lookupMetadata(movieId))
    .finally(() => inflight.delete(movieId));

  inflight.set(movieId, request);
  return request;
}

