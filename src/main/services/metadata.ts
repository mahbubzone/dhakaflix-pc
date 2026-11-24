/**
 * Metadata Service
 * 
 * Fetches movie/series metadata from Cinemeta (Stremio's free API).
 */

import { fetchJson } from '../utils/http';
import { logger } from '../utils/logger';

const CINEMETA_BASE = 'https://v3-cinemeta.strem.io';

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
 * Find best match for a movie by title and year
 */
export async function findMovieMetadata(
  title: string,
  year: number | null,
  type: 'movie' | 'series' = 'movie'
): Promise<CinemetaMeta | null> {
  const results = await searchCinemeta(title, type);
  
  if (results.length === 0) {
    return null;
  }

  // Find best match by year
  let bestMatch = results[0];
  
  if (year) {
    const yearMatch = results.find((r) => {
      const releaseYear = r.releaseInfo?.match(/^\d{4}/)?.[0];
      return releaseYear && Math.abs(parseInt(releaseYear) - year) <= 1;
    });
    
    if (yearMatch) {
      bestMatch = yearMatch;
    }
  }

  // Get full metadata
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
