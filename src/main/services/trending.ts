/**
 * Trending Service
 *
 * Cinemeta top catalogs (movie/series) cached for 24h and matched to real
 * library titles. Every value shown to the renderer comes from either Cinemeta
 * or the local DB; nothing is invented. Failures never reach the renderer.
 */

import { fetchJson } from '../utils/http';
import { logger } from '../utils/logger';
import { getDatabase, getDatabaseService } from './database';
import {
  normalizeAwards,
  normalizeNamesJson,
  normalizeTrailerStreams,
  parseRating,
  parseRuntime,
} from './metadata';
import type {
  Movie,
  TrendingKind,
  TrendingMeta,
  TrendingMovieItem,
} from '../../shared/types';

const CINEMETA_BASE = 'https://v3-cinemeta.strem.io';
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const PAGE_SKIPS = [0, 50, 100] as const;
const MAX_ENTRIES = 100;
const IMDB_ID = /^tt\d{7,10}$/;

/** Cinemeta top metas carry both movie and series fields. */
interface CinemetaCatalogMeta {
  id?: string;
  imdb_id?: string;
  name?: string;
  year?: string | number;
  releaseInfo?: string;
  imdbRating?: string;
  runtime?: string;
  genres?: string[];
  genre?: string[] | string;
  description?: string;
  poster?: string;
  background?: string;
  logo?: string;
  cast?: string[];
  director?: string[];
  awards?: unknown;
  trailerStreams?: unknown;
  trailers?: unknown;
}

// ============================================================
// Pure normalization / matching helpers
// ============================================================

/** Year may be a number, "2024", or a range such as "2021–". */
export function normalizeYear(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value !== 'string') return null;
  const match = value.match(/\b(?:18|19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

/** Cinemeta arrays are not always arrays; accept one string as a single entry. */
export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      .map((item) => item.trim());
  }
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

/** Normalize one top-catalog meta. Returns null when there is no real IMDb id/title. */
export function normalizeTrendingMeta(
  raw: CinemetaCatalogMeta,
  rank: number
): TrendingMeta | null {
  const imdbId = IMDB_ID.test(raw.imdb_id ?? '')
    ? (raw.imdb_id as string)
    : IMDB_ID.test(raw.id ?? '')
      ? (raw.id as string)
      : null;
  const title = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!imdbId || !title) return null;

  const genres = toStringArray(raw.genres);
  return {
    imdb_id: imdbId,
    title,
    year: normalizeYear(raw.year) ?? normalizeYear(raw.releaseInfo),
    rating: parseRating(raw.imdbRating),
    runtime: parseRuntime(raw.runtime),
    genres: genres.length > 0 ? genres : toStringArray(raw.genre),
    plot: typeof raw.description === 'string' ? raw.description.trim() : '',
    poster: typeof raw.poster === 'string' && raw.poster ? raw.poster : null,
    backdrop: typeof raw.background === 'string' && raw.background ? raw.background : null,
    logo: typeof raw.logo === 'string' && raw.logo ? raw.logo : null,
    cast: toStringArray(raw.cast),
    director: toStringArray(raw.director),
    awards: normalizeAwards(raw.awards),
    trailers: normalizeTrailerStreams(raw.trailerStreams ?? raw.trailers),
    rank,
  };
}

/**
 * Rank prefix, punctuation and case must not stop a real match:
 * "001. The Godfather-Part II (1974)" -> "the godfather part ii 1974".
 */
export function normalizeTitle(title: string): string {
  if (typeof title !== 'string') return '';
  return title
    .replace(/^\s*\d{1,4}\s*[.)-]\s+/, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

export interface TrendingMatch {
  meta: TrendingMeta;
  movie: Movie;
}

/**
 * Match trending metas to local titles by normalized name. A local year within
 * +/-1 of the Cinemeta year wins. Each library id is used at most once, and
 * result order follows the Cinemeta rank order.
 */
export function matchTrendingToLocal(
  metas: readonly TrendingMeta[],
  local: readonly Movie[],
  kind: TrendingKind
): TrendingMatch[] {
  const wantedKind = kind === 'movie' ? 0 : 1;
  const byTitle = new Map<string, Movie[]>();
  for (const movie of local) {
    if (movie.kind !== wantedKind) continue;
    // Documentaries have their own tab; never surface them as movies/series.
    if (movie.category === 'Documentary') continue;
    const key = normalizeTitle(movie.title);
    if (!key) continue;
    const existing = byTitle.get(key);
    if (existing) existing.push(movie);
    else byTitle.set(key, [movie]);
  }

  const used = new Set<number>();
  const matches: TrendingMatch[] = [];
  for (const meta of metas) {
    const candidates = byTitle.get(normalizeTitle(meta.title));
    if (!candidates) continue;

    let best: Movie | null = null;
    if (meta.year !== null) {
      // A title alone is not enough: "The Bodyguard" (1992) and the 2026
      // Cinemeta entry are different films. Accept only a year-compatible
      // local row, and skip the trending entry entirely otherwise.
      best = candidates.find((movie) =>
        !used.has(movie.id)
        && typeof movie.year === 'number'
        && Math.abs(movie.year - meta.year!) <= 1
      ) ?? null;
      if (!best) continue;
    } else {
      best = candidates.find((movie) => !used.has(movie.id)) ?? null;
    }
    if (!best) continue;

    used.add(best.id);
    matches.push({ meta, movie: best });
  }
  return matches;
}

export function toTrendingItems(
  matches: readonly TrendingMatch[],
  limit: number
): TrendingMovieItem[] {
  return matches.slice(0, Math.max(0, limit)).map(({ meta, movie }) => ({
    movie,
    rank: meta.rank,
    rating: meta.rating,
  }));
}

/** True while a cache row is fresh. A small negative delta allows clock skew. */
export function isCacheFresh(fetchedAt: number, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!Number.isFinite(fetchedAt)) return false;
  return nowSeconds - fetchedAt < CACHE_TTL_SECONDS && nowSeconds - fetchedAt >= -60;
}

// ============================================================
// Cache + fetch
// ============================================================

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** `staleOk` is only for the fetch-failure fallback; shape validation always applies. */
function readCache(kind: TrendingKind, staleOk = false): TrendingMeta[] | null {
  const row = getDatabaseService().getTrendingCache(kind);
  if (!row) return null;
  if (!staleOk && !isCacheFresh(row.fetchedAt)) return null;

  try {
    const parsed: unknown = JSON.parse(row.payload);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((item): item is TrendingMeta =>
      Boolean(item)
      && typeof item === 'object'
      && typeof (item as TrendingMeta).imdb_id === 'string'
      && typeof (item as TrendingMeta).title === 'string'
      && typeof (item as TrendingMeta).rank === 'number'
    );
  } catch {
    return null;
  }
}

function catalogUrl(kind: TrendingKind, skip: number): string {
  const base = `${CINEMETA_BASE}/catalog/${kind}/top`;
  return skip === 0 ? `${base}.json` : `${base}/skip=${skip}.json`;
}

async function fetchTrending(kind: TrendingKind): Promise<TrendingMeta[]> {
  const pages = await Promise.all(PAGE_SKIPS.map((skip) =>
    fetchJson<{ metas?: CinemetaCatalogMeta[] }>(catalogUrl(kind, skip), {
      timeout: 12000,
      retries: 1,
    })
  ));

  const items: TrendingMeta[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const raw of page?.metas ?? []) {
      const meta = normalizeTrendingMeta(raw, items.length + 1);
      if (!meta || seen.has(meta.imdb_id)) continue;
      seen.add(meta.imdb_id);
      items.push(meta);
      if (items.length >= MAX_ENTRIES) break;
    }
    if (items.length >= MAX_ENTRIES) break;
  }
  return items;
}

const inflight = new Map<TrendingKind, Promise<TrendingMeta[]>>();

/** Cached for 24h. On failure returns the last payload, or an empty array. */
export function getTrending(kind: TrendingKind): Promise<TrendingMeta[]> {
  const pending = inflight.get(kind);
  if (pending) return pending;

  const request = (async () => {
    const cached = readCache(kind);
    if (cached) return cached;

    try {
      const items = await fetchTrending(kind);
      getDatabaseService().saveTrendingCache(kind, JSON.stringify(items), nowSeconds());
      return items;
    } catch (error) {
      logger.warn('Trending catalog fetch failed', {
        kind,
        error: error instanceof Error ? error.message : String(error),
      });
      // A stale but well-formed payload is still better than nothing.
      try {
        return readCache(kind, true) ?? [];
      } catch {
        // Never throw to the renderer.
        return [];
      }
    }
  })().finally(() => inflight.delete(kind));

  inflight.set(kind, request);
  return request;
}

// ============================================================
// Local matching + metadata priming
// ============================================================

/** Full rows are cached between scans so Detail keeps working after a click. */
let localMovies: Movie[] | null = null;

function getLocalMovies(): readonly Movie[] {
  if (!localMovies) {
    localMovies = getDatabase()
      .prepare('SELECT * FROM movies')
      .all() as Movie[];
  }
  return localMovies;
}

/** Called by the crawler completion handler so newly scanned titles join trending. */
export function invalidateTrendingLocalCache(): void {
  localMovies = null;
}

/**
 * Fetch (or read cached) trending metas, match them to the local library and
 * prime the metadata cache so the renderer's getCached path is instant.
 */
export async function resolveTrendingMovies(
  kind: TrendingKind,
  limit: number
): Promise<TrendingMovieItem[]> {
  const metas = await getTrending(kind);
  const matches = matchTrendingToLocal(metas, getLocalMovies(), kind);
  const selected = matches.slice(0, Math.max(0, limit));
  const db = getDatabaseService();

  for (const { meta, movie } of selected) {
    db.saveMetadata(movie.id, {
      imdb_id: meta.imdb_id,
      title: meta.title,
      plot: meta.plot || null,
      rating: meta.rating,
      runtime: meta.runtime,
      genres: meta.genres.length > 0 ? JSON.stringify(meta.genres) : null,
      poster_url: meta.poster,
      backdrop_url: meta.backdrop,
      logo_url: meta.logo,
      cast: normalizeNamesJson(meta.cast),
      director: normalizeNamesJson(meta.director),
      awards: meta.awards ?? null,
      trailers: meta.trailers ?? null,
    });
  }

  return toTrendingItems(selected, limit);
}
