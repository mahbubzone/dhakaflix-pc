/**
 * Batched Home Data
 *
 * Builds one plain payload for the Home view so the renderer does not need
 * several round trips. SQL and ordering mirror the existing Home queries.
 */

import { getDatabase, getDatabaseService } from './database';
import type { Movie, MovieWithProgress } from '../../shared/types';

export interface HomeCategoryRow {
  category: string;
  movies: Movie[];
}

export interface HomeData {
  watching: MovieWithProgress[];
  recent: Movie[];
  categoryRows: HomeCategoryRow[];
  watchlistCount: number;
}

/** Real library categories that get Home rails, in display order. */
export const FEATURED_CATEGORIES: readonly string[] = [
  'English Movies',
  'English Movies (1080p)',
  'Cartoon TV Series',
  'Korean TV & Web Series',
  'Documentary',
  'Awards & TV Shows',
];

const WATCHING_LIMIT = 20;
const RECENT_LIMIT = 15;
const CATEGORY_LIMIT = 12;
const CATEGORY_ROWS = 5;

/** Featured categories first, then remaining categories in input order. */
export function getFeaturedCategoryOrder(names: string[]): string[] {
  const available = new Set(names);
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const name of FEATURED_CATEGORIES) {
    if (available.has(name) && !seen.has(name)) {
      ordered.push(name);
      seen.add(name);
    }
  }
  for (const name of names) {
    if (!seen.has(name)) {
      ordered.push(name);
      seen.add(name);
    }
  }
  return ordered;
}

export function getHomeData(): HomeData {
  const db = getDatabase();
  const service = getDatabaseService();

  const watching = db.prepare(`
    SELECT m.*, p.position, p.duration
    FROM progress p
    JOIN movies m ON m.id = p.movie_id
    WHERE p.episode_id IS NULL
      AND p.watched = 0 AND p.duration > 0 AND p.position > 0
      AND p.position < p.duration * 0.95
    ORDER BY p.updated_at DESC
    LIMIT ?
  `).all(WATCHING_LIMIT) as MovieWithProgress[];

  const recent = db.prepare(`
    SELECT * FROM movies ORDER BY added DESC LIMIT ?
  `).all(RECENT_LIMIT) as Movie[];

  const categoryNames = service.getCategories().map((row) => row.category);
  const categoryRows = getFeaturedCategoryOrder(categoryNames)
    .slice(0, CATEGORY_ROWS)
    .map((category) => ({
      category,
      movies: service.getMovies({
        category,
        limit: CATEGORY_LIMIT,
        offset: 0,
        sortBy: 'added',
        sortOrder: 'desc',
      }).movies,
    }))
    .filter((row) => row.movies.length > 0);

  return {
    watching,
    recent,
    categoryRows,
    watchlistCount: service.getWatchlistCount(),
  };
}
