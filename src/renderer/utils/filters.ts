/**
 * Client-side filters (guide §8).
 *
 * The legacy year/feature helpers stay unchanged for existing callers and
 * tests. CatalogFilters drives the new FilterBar used by Home, Category and
 * Search. It filters titles already loaded from the DB; no fabricated values.
 */

import type { Movie } from '../types';
import { parseGenres } from './metadata';

export type LegacyYearFilter = 'any' | '2020s' | '2010s' | '2000s' | '1990s' | 'pre1990';
/** Legacy decade chips plus an exact year such as "2024". */
export type YearFilter = LegacyYearFilter | `${number}`;
export type FeatureFilter = 'foreign' | '1080p+' | 'dual-audio';

export const YEAR_FILTERS: { id: YearFilter; label: string }[] = [
  { id: 'any', label: 'Any year' },
  { id: '2020s', label: '2020s' },
  { id: '2010s', label: '2010s' },
  { id: '2000s', label: '2000s' },
  { id: '1990s', label: '1990s' },
  { id: 'pre1990', label: 'Before 1990' },
];

export const FEATURE_FILTERS: { id: FeatureFilter; label: string }[] = [
  { id: 'foreign', label: 'Foreign' },
  { id: '1080p+', label: '1080p+' },
  { id: 'dual-audio', label: 'Dual Audio' },
];

type FilterableMovie = Pick<Movie, 'year' | 'quality' | 'dual_audio' | 'category'>;

const NON_ENGLISH_CATEGORY =
  /foreign|korean|hindi|south|bangla|anime|cartoon|animation|japanese|chinese|thai|spanish|french|italian|russian|turkish|indonesian/i;

export function matchesYear(movie: FilterableMovie, year: YearFilter): boolean {
  if (year === 'any') return true;
  const value = movie.year;
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;

  if (/^\d{4}$/.test(year)) return value === Number(year);

  switch (year as LegacyYearFilter) {
    case '2020s': return value >= 2020 && value <= 2029;
    case '2010s': return value >= 2010 && value <= 2019;
    case '2000s': return value >= 2000 && value <= 2009;
    case '1990s': return value >= 1990 && value <= 1999;
    case 'pre1990': return value < 1990;
    default: return false;
  }
}

/** Every real year in the loaded titles, newest first. Used by FilterBar. */
export function getAvailableYears(movies: readonly Pick<Movie, 'year'>[]): number[] {
  const years = new Set<number>();
  for (const movie of movies) {
    if (typeof movie.year === 'number' && Number.isFinite(movie.year)) years.add(Math.trunc(movie.year));
  }
  return [...years].sort((a, b) => b - a);
}

export function matchesFeature(movie: FilterableMovie, filter: FeatureFilter): boolean {
  switch (filter) {
    case 'foreign':
      return NON_ENGLISH_CATEGORY.test(movie.category ?? '');
    case '1080p+':
      return /1080|2160|4k/i.test(movie.quality ?? '');
    case 'dual-audio':
      return movie.dual_audio === 1;
  }
}

/** Year chips are single-select; feature chips combine with AND. */
export function applyMovieFilters<T extends FilterableMovie>(
  movies: T[],
  year: YearFilter,
  features: FeatureFilter[]
): T[] {
  return movies.filter(
    (movie) => matchesYear(movie, year) && features.every((feature) => matchesFeature(movie, feature))
  );
}

/* ------------------------------------------------------------------ */
/* Catalog filters (FilterBar)                                         */
/* ------------------------------------------------------------------ */

export type QualityFilter = 'any' | '1080p' | '720p';
export type AudioFilter = 'any' | 'dual';
export type SortFilter = 'added' | 'rating' | 'newest' | 'title';

export interface CatalogFilters {
  genre: string;
  year: YearFilter;
  quality: QualityFilter;
  audio: AudioFilter;
  sort: SortFilter;
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  genre: '',
  year: 'any',
  quality: 'any',
  audio: 'any',
  sort: 'added',
};

/** Only real cached fields are consulted; absent metadata never matches. */
export type CachedMetaView = Pick<MetadataLike, 'rating' | 'genres'>;
type MetadataLike = { rating: number | null; genres: string | null };

export function catalogFilterCount(filters: CatalogFilters): number {
  return Number(Boolean(filters.genre))
    + Number(filters.year !== 'any')
    + Number(filters.quality !== 'any')
    + Number(filters.audio === 'dual');
}

export function hasCatalogFilters(filters: CatalogFilters): boolean {
  return catalogFilterCount(filters) > 0;
}

export function applyCatalogFilters<T extends Movie>(
  movies: readonly T[],
  filters: CatalogFilters,
  metaById?: ReadonlyMap<number, CachedMetaView>
): T[] {
  const list = movies.filter((movie) => {
    if (filters.genre) {
      const genres = parseGenres(metaById?.get(movie.id)?.genres);
      if (!genres.includes(filters.genre)) return false;
    }

    if (!matchesYear(movie, filters.year)) return false;

    if (filters.quality !== 'any') {
      const quality = movie.quality ?? '';
      if (filters.quality === '1080p' && !/1080|2160|4k/i.test(quality)) return false;
      if (filters.quality === '720p' && !/720p/i.test(quality)) return false;
    }

    if (filters.audio === 'dual' && movie.dual_audio !== 1) return false;
    return true;
  });

  const ratingOf = (movie: T) => metaById?.get(movie.id)?.rating ?? -1;

  switch (filters.sort) {
    case 'rating':
      return list.sort((a, b) => ratingOf(b) - ratingOf(a));
    case 'newest':
      return list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    case 'title':
      return list.sort((a, b) => a.title.localeCompare(b.title));
    case 'added':
    default:
      return list.sort((a, b) => b.added - a.added);
  }
}
