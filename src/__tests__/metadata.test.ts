/**
 * Focused unit tests for metadata normalization, cache rules, and validation.
 * These tests make no network calls and use no real library records.
 */

import {
  findMatchingCinemetaResult,
  isFreshNegativeCache,
  NEGATIVE_CACHE_TTL_SECONDS,
  normalizeAwards,
  normalizeCinemetaMeta,
  normalizeNamesJson,
  normalizeTrailerStreams,
  normalizeYoutubeId,
  parseRating,
  parseRuntime,
} from '../main/services/metadata';
import { isValidMovieId } from '../main/utils/validation';
import {
  formatGenres,
  formatRating,
  formatRuntime,
  isMetadataUsable,
} from '../renderer/utils/metadata';
import type { Metadata } from '../renderer/types';

function metaRow(overrides: Partial<Metadata> = {}): Metadata {
  return {
    id: 1,
    movie_id: 1,
    imdb_id: 'tt0000001',
    title: 'Example',
    plot: null,
    rating: null,
    runtime: null,
    genres: null,
    poster_url: null,
    backdrop_url: null,
    logo_url: null,
    cast: null,
    director: null,
    awards: null,
    trailers: null,
    fetched_at: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

describe('parseRating', () => {
  it('parses numeric strings and rejects non-ratings', () => {
    expect(parseRating('7.8')).toBe(7.8);
    expect(parseRating('8')).toBe(8);
    expect(parseRating('N/A')).toBeNull();
    expect(parseRating('unknown')).toBeNull();
    expect(parseRating('')).toBeNull();
    expect(parseRating()).toBeNull();
  });
});

describe('parseRuntime', () => {
  it('parses Cinemeta runtime formats', () => {
    expect(parseRuntime('2h 30min')).toBe(150);
    expect(parseRuntime('150 min')).toBe(150);
    expect(parseRuntime('2:30')).toBe(150);
    expect(parseRuntime('N/A')).toBeNull();
    expect(parseRuntime()).toBeNull();
  });
});

describe('normalizeCinemetaMeta', () => {
  it('maps a detail response to cache columns', () => {
    expect(normalizeCinemetaMeta({
      id: 'tt0000001',
      type: 'movie',
      name: 'Example',
      imdbRating: '7.8',
      runtime: '2h 30min',
      genres: ['Crime', 'Drama'],
      description: 'A short plot.',
      poster: 'https://example.invalid/poster.jpg',
      background: 'https://example.invalid/backdrop.jpg',
      logo: 'https://example.invalid/logo.png',
      cast: ['Jane Doe', ' John Roe '],
      director: ['Director One'],
      awards: 'Won 1 Oscar',
      trailerStreams: [{ ytId: 'dQw4w9WgXcQ', type: 'Trailer' }],
    })).toEqual({
      imdb_id: 'tt0000001',
      title: 'Example',
      plot: 'A short plot.',
      rating: 7.8,
      runtime: 150,
      genres: '["Crime","Drama"]',
      poster_url: 'https://example.invalid/poster.jpg',
      backdrop_url: 'https://example.invalid/backdrop.jpg',
      logo_url: 'https://example.invalid/logo.png',
      cast: '["Jane Doe","John Roe"]',
      director: '["Director One"]',
      awards: 'Won 1 Oscar',
      trailers: '[{"youtubeId":"dQw4w9WgXcQ","type":"Trailer"}]',
    });
  });

  it('maps a missing rating, runtime and genres to null', () => {
    const result = normalizeCinemetaMeta({
      id: 'tt0000002',
      type: 'movie',
      name: 'Example 2',
      imdbRating: 'N/A',
      runtime: 'N/A',
    });

    expect(result.rating).toBeNull();
    expect(result.runtime).toBeNull();
    expect(result.genres).toBeNull();
    expect(result.backdrop_url).toBeNull();
    expect(result.logo_url).toBeNull();
    expect(result.cast).toBeNull();
    expect(result.director).toBeNull();
    expect(result.awards).toBeNull();
    expect(result.trailers).toBeNull();
  });

  it('uses the imdb_id sentinel for a miss and invents no other values', () => {
    expect(normalizeCinemetaMeta(null)).toEqual({
      imdb_id: '',
      title: null,
      plot: null,
      rating: null,
      runtime: null,
      genres: null,
      poster_url: null,
      backdrop_url: null,
      logo_url: null,
      cast: null,
      director: null,
      awards: null,
      trailers: null,
    });
  });
});

describe('More Info normalization helpers', () => {
  it('stores only real cast and director names as JSON', () => {
    expect(normalizeNamesJson(['Jane Doe', '', 5, ' John Roe '])).toBe('["Jane Doe","John Roe"]');
    expect(normalizeNamesJson('Solo Name')).toBe('["Solo Name"]');
    expect(normalizeNamesJson([])).toBeNull();
    expect(normalizeNamesJson(undefined)).toBeNull();
  });

  it('renders awards strings and nested objects without inventing values', () => {
    expect(normalizeAwards(' Won 2 Oscars ')).toBe('Won 2 Oscars');
    expect(normalizeAwards({ oscars: { wins: 2, nominations: 5 }, other: 'Won 1' }))
      .toBe('oscars: wins: 2; nominations: 5; other: Won 1');
    expect(normalizeAwards({})).toBeNull();
    expect(normalizeAwards(null)).toBeNull();
    expect(normalizeAwards('  ')).toBeNull();
  });

  it('extracts only real YouTube ids', () => {
    expect(normalizeYoutubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(normalizeYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1'))
      .toBe('dQw4w9WgXcQ');
    expect(normalizeYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(normalizeYoutubeId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'))
      .toBe('dQw4w9WgXcQ');
    expect(normalizeYoutubeId('https://vimeo.com/123')).toBeNull();
    expect(normalizeYoutubeId('short')).toBeNull();
  });

  it('maps trailerStreams and trailers into embeddable JSON entries', () => {
    expect(normalizeTrailerStreams([
      { source: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', type: 'Trailer' },
      { ytId: 'dQw4w9WgXcQ', type: 'Trailer' },
      { ytId: 'aaaaaaaaaaa' },
      { source: 'https://vimeo.com/123', type: 'Trailer' },
      { type: 'Teaser' },
      null,
    ])).toBe('[{"youtubeId":"dQw4w9WgXcQ","type":"Trailer"},{"youtubeId":"aaaaaaaaaaa","type":null}]');
    expect(normalizeTrailerStreams([{ ytId: 'bbbbbbbbbbb', type: 'Teaser' }]))
      .toBe('[{"youtubeId":"bbbbbbbbbbb","type":"Teaser"}]');
    expect(normalizeTrailerStreams('not an array')).toBeNull();
    expect(normalizeTrailerStreams([])).toBeNull();
  });

  it('accepts legacy trailers when trailerStreams is absent', () => {
    const result = normalizeCinemetaMeta({
      id: 'tt0000003',
      type: 'movie',
      name: 'Legacy Trailers',
      trailers: [{ ytId: 'ccccccccccc', type: 'Trailer' }],
    });
    expect(result.trailers).toBe('[{"youtubeId":"ccccccccccc","type":"Trailer"}]');
  });
});

describe('findMatchingCinemetaResult', () => {
  const results = [
    { id: 'tt2026', releaseInfo: '2026' },
    { id: 'tt1992', releaseInfo: '1992' },
  ];

  it('rejects a title-only match when a numeric year is supplied', () => {
    expect(findMatchingCinemetaResult(results, 1992)).toBe(results[1]);
    expect(findMatchingCinemetaResult(results, 1991)).toBe(results[1]);
    expect(findMatchingCinemetaResult(results, 1980)).toBeNull();
    expect(findMatchingCinemetaResult([], 1992)).toBeNull();
  });

  it('keeps the first result when no year is known', () => {
    expect(findMatchingCinemetaResult(results, null)).toBe(results[0]);
    expect(findMatchingCinemetaResult(results, Number.NaN)).toBe(results[0]);
  });
});

describe('negative cache TTL', () => {
  it('expires misses after 24 hours but keeps successful rows', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isFreshNegativeCache(metaRow({ imdb_id: '' }), now)).toBe(true);
    expect(isFreshNegativeCache(
      metaRow({ imdb_id: '', fetched_at: now - NEGATIVE_CACHE_TTL_SECONDS - 1 }),
      now
    )).toBe(false);
    expect(isFreshNegativeCache(metaRow(), now)).toBe(false);
    expect(isFreshNegativeCache(null, now)).toBe(false);
  });
});

describe('renderer metadata formatting', () => {
  it('only treats real imdb ids as usable', () => {
    expect(isMetadataUsable(metaRow())).toBe(true);
    expect(isMetadataUsable(metaRow({ imdb_id: '' }))).toBe(false);
    expect(isMetadataUsable(null)).toBe(false);
  });

  it('formats JSON genres, runtime and rating', () => {
    expect(formatGenres('["Crime","Drama"]')).toBe('Crime, Drama');
    expect(formatRuntime(150)).toBe('2h 30m');
    expect(formatRuntime(null)).toBe('');
    expect(formatRating(7.8)).toBe('7.8');
    expect(formatRating(Number.NaN)).toBeNull();
  });
});

describe('IPC movie id validation', () => {
  it('accepts only positive integers', () => {
    expect(isValidMovieId(1)).toBe(true);
    expect(isValidMovieId(0)).toBe(false);
    expect(isValidMovieId(-1)).toBe(false);
    expect(isValidMovieId(1.5)).toBe(false);
    expect(isValidMovieId('1')).toBe(false);
    expect(isValidMovieId(null)).toBe(false);
  });
});
