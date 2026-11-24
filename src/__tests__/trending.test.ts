/**
 * Focused tests for trending normalization and local matching helpers.
 * Pure helpers only: no network and no database are touched.
 */

import {
  isCacheFresh,
  matchTrendingToLocal,
  normalizeTitle,
  normalizeTrendingMeta,
  normalizeYear,
  toTrendingItems,
  toStringArray,
  type TrendingMatch,
} from '../main/services/trending';
import type { Movie, TrendingMeta } from '../shared/types';

function movie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 1,
    href: '/example',
    parent: null,
    source_id: 1,
    category: 'English Movies',
    title: 'Example',
    year: 2024,
    quality: '1080p',
    dual_audio: 0,
    kind: 0,
    poster: null,
    video: null,
    size: 0,
    added: 0,
    seen: 0,
    ...overrides,
  };
}

function meta(overrides: Partial<TrendingMeta> = {}): TrendingMeta {
  return {
    imdb_id: 'tt0111161',
    title: 'Example',
    year: 2024,
    rating: 8.7,
    runtime: 142,
    genres: ['Drama'],
    plot: 'Real plot',
    poster: 'https://example/poster.jpg',
    backdrop: null,
    logo: null,
    cast: [],
    director: [],
    rank: 1,
    ...overrides,
  };
}

describe('trending normalization', () => {
  it('reads years from numbers, plain years and year ranges', () => {
    expect(normalizeYear(2024)).toBe(2024);
    expect(normalizeYear('2021–')).toBe(2021);
    expect(normalizeYear('2026')).toBe(2026);
    expect(normalizeYear('unknown')).toBeNull();
    expect(normalizeYear(undefined)).toBeNull();
  });

  it('accepts only real string entries in Cinemeta arrays', () => {
    expect(toStringArray(['Drama', 5, null, ' Crime '])).toEqual(['Drama', 'Crime']);
    expect(toStringArray('Action')).toEqual(['Action']);
    expect(toStringArray(undefined)).toEqual([]);
  });

  it('normalizes a top meta without inventing missing values', () => {
    const normalized = normalizeTrendingMeta({
      id: 'tt0111161',
      imdb_id: 'tt0111161',
      name: 'The Shawshank Redemption',
      year: '1994',
      imdbRating: '9.3',
      runtime: '142 min',
      genres: ['Drama'],
      genre: ['Drama'],
      description: 'Two imprisoned men bond over a number of years.',
      poster: 'https://example/poster.jpg',
      background: 'https://example/backdrop.jpg',
      cast: ['Tim Robbins'],
      director: ['Frank Darabont'],
      releaseInfo: '1994',
    }, 7);

    expect(normalized).toMatchObject({
      imdb_id: 'tt0111161',
      title: 'The Shawshank Redemption',
      year: 1994,
      rating: 9.3,
      runtime: 142,
      genres: ['Drama'],
      rank: 7,
    });
    expect(normalized?.backdrop).toBe('https://example/backdrop.jpg');
    expect(normalized?.logo).toBeNull();
  });

  it('uses releaseInfo when year is present but unparseable', () => {
    const normalized = normalizeTrendingMeta({
      id: 'tt0903747',
      name: 'Breaking Bad',
      year: 'N/A',
      releaseInfo: '2008–2013',
    }, 4);
    expect(normalized?.year).toBe(2008);
  });

  it('falls back to id and rejects unusable metas', () => {
    expect(normalizeTrendingMeta({ id: 'tt0133093', name: 'The Matrix' }, 1)?.imdb_id)
      .toBe('tt0133093');
    expect(normalizeTrendingMeta({ name: 'No id' }, 2)).toBeNull();
    expect(normalizeTrendingMeta({ imdb_id: 'tt1', name: 'Bad id' }, 3)).toBeNull();
  });

  it('strips rank prefixes, punctuation, extra spaces and case', () => {
    expect(normalizeTitle('001. The Godfather-Part II (1974)')).toBe('the godfather part ii 1974');
    expect(normalizeTitle('  The   Matrix  ')).toBe('the matrix');
    expect(normalizeTitle('Spice and Wolf: Merchant Meets the Wise Wolf'))
      .toBe('spice and wolf merchant meets the wise wolf');
  });
});

describe('trending local matching', () => {
  it('requires a compatible year and never reuses an id', () => {
    const local = [
      movie({ id: 10, title: '001. Example', year: 2020 }),
      movie({ id: 11, title: 'Example', year: 2024 }),
      movie({ id: 12, title: 'Example', year: 2015 }),
      movie({ id: 13, title: 'Wrong Kind', year: 2024, kind: 1 }),
    ];
    const metas = [meta({ rank: 5 }), meta({ rank: 8 }), meta({ rank: 9 }), meta({ rank: 10 })];

    const matches = matchTrendingToLocal(metas, local, 'movie');
    expect(matches.map((match) => match.movie.id)).toEqual([11]);
    expect(matches.map((match) => match.meta.rank)).toEqual([5]);
    expect(new Set(matches.map((match) => match.movie.id)).size).toBe(matches.length);
  });

  it('does not match a same-title film from a different year', () => {
    const local = [movie({ id: 1, title: 'The Bodyguard', year: 1992 })];
    const metas = [meta({ title: 'The Bodyguard', year: 2026, imdb_id: 'tt33764258' })];
    expect(matchTrendingToLocal(metas, local, 'movie')).toEqual([]);
  });

  it('filters by kind and limits ranked items', () => {
    const local = [
      movie({ id: 1, title: 'Example', kind: 0 }),
      movie({ id: 2, title: 'Example', kind: 1 }),
    ];
    const matches: TrendingMatch[] = matchTrendingToLocal([meta()], local, 'series');
    expect(matches[0].movie.id).toBe(2);

    expect(toTrendingItems(matches, 1)).toEqual([
      { movie: local[1], rank: 1, rating: 8.7 },
    ]);
  });

  it('treats a 24h-old cache as fresh and older rows as stale', () => {
    const now = 1_000_000;
    expect(isCacheFresh(now, now)).toBe(true);
    expect(isCacheFresh(now - 24 * 60 * 60 + 1, now)).toBe(true);
    expect(isCacheFresh(now - 24 * 60 * 60, now)).toBe(false);
    expect(isCacheFresh(Number.NaN, now)).toBe(false);
  });
});
