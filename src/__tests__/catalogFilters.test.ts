import {
  applyCatalogFilters,
  catalogFilterCount,
  DEFAULT_CATALOG_FILTERS,
  hasCatalogFilters,
  RATING_FILTERS,
  type CatalogFilters,
} from '../renderer/utils/filters';
import type { Movie } from '../renderer/types';

function movie(id: number): Movie {
  return {
    id,
    href: `/movie-${id}`,
    parent: null,
    source_id: 1,
    category: 'English Movies',
    title: `Movie ${id}`,
    year: 2020 + id,
    quality: '1080p',
    dual_audio: 0,
    kind: 0,
    poster: null,
    video: null,
    size: 0,
    added: id,
    seen: 0,
  };
}

const meta = new Map<number, { rating: number | null; genres: string | null }>([
  [1, { rating: 9.1, genres: null }],
  [2, { rating: 8, genres: null }],
  [3, { rating: 7.9, genres: null }],
  [4, { rating: null, genres: null }],
]);

const movies = [1, 2, 3, 4].map(movie);
const withRating = (rating: CatalogFilters['rating']): CatalogFilters => ({
  ...DEFAULT_CATALOG_FILTERS,
  rating,
});

describe('catalog rating filter', () => {
  it('offers the approved labels and defaults to all ratings', () => {
    expect(RATING_FILTERS).toEqual([
      { id: 'all', label: 'All ratings' },
      { id: '9', label: '9+' },
      { id: '8', label: '8+' },
      { id: '7', label: '7+' },
      { id: '6', label: '6+' },
    ]);
    expect(DEFAULT_CATALOG_FILTERS.rating).toBe('all');
    expect(hasCatalogFilters(withRating('all'))).toBe(false);
  });

  it('keeps only real ratings at or above the selected threshold', () => {
    expect(applyCatalogFilters(movies, withRating('9'), meta).map((item) => item.id)).toEqual([1]);
    expect(applyCatalogFilters(movies, withRating('8'), meta).map((item) => item.id)).toEqual([2, 1]);
    expect(applyCatalogFilters(movies, withRating('7'), meta).map((item) => item.id)).toEqual([3, 2, 1]);
  });

  it('excludes unrated titles whenever a rating filter is active', () => {
    const ids = applyCatalogFilters(movies, withRating('6'), meta).map((item) => item.id);
    expect(ids).toContain(1);
    expect(ids).not.toContain(4);
    expect(applyCatalogFilters(movies, withRating('all'), meta)).toHaveLength(4);
  });

  it('counts the rating filter as one active filter', () => {
    expect(catalogFilterCount(withRating('9'))).toBe(1);
    expect(catalogFilterCount(withRating('all'))).toBe(0);
    expect(catalogFilterCount({ ...withRating('8'), genre: 'Drama', audio: 'dual' })).toBe(3);
  });
});
