import {
  applyMovieFilters,
  getAvailableYears,
  matchesFeature,
  matchesYear,
} from '../renderer/utils/filters';
import type { Movie } from '../renderer/types';

function movie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 1,
    href: '/example',
    parent: null,
    source_id: 1,
    category: 'English Movies',
    title: 'Example',
    year: 2024,
    quality: '720p',
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

describe('category filters', () => {
  it('matches year ranges and excludes unknown years', () => {
    expect(matchesYear(movie({ year: 2024 }), '2020s')).toBe(true);
    expect(matchesYear(movie({ year: 2019 }), '2020s')).toBe(false);
    expect(matchesYear(movie({ year: 1989 }), 'pre1990')).toBe(true);
    expect(matchesYear(movie({ year: null }), '2020s')).toBe(false);
    expect(matchesYear(movie({ year: null }), 'any')).toBe(true);
  });

  it('matches foreign, 1080p+ and dual audio', () => {
    expect(matchesFeature(movie({ category: 'Korean TV & Web Series' }), 'foreign')).toBe(true);
    expect(matchesFeature(movie({ category: 'English Movies' }), 'foreign')).toBe(false);
    expect(matchesFeature(movie({ quality: '1080p' }), '1080p+')).toBe(true);
    expect(matchesFeature(movie({ quality: '2160p' }), '1080p+')).toBe(true);
    expect(matchesFeature(movie({ quality: '720p' }), '1080p+')).toBe(false);
    expect(matchesFeature(movie({ dual_audio: 1 }), 'dual-audio')).toBe(true);
    expect(matchesFeature(movie({ dual_audio: 0 }), 'dual-audio')).toBe(false);
  });

  it('combines a year chip with feature chips using AND', () => {
    const movies = [
      movie({ id: 1, year: 2024, category: 'Korean TV & Web Series', quality: '1080p', dual_audio: 1 }),
      movie({ id: 2, year: 2024, category: 'English Movies', quality: '1080p', dual_audio: 1 }),
      movie({ id: 3, year: 2014, category: 'Korean TV & Web Series', quality: '1080p', dual_audio: 1 }),
    ];

    expect(applyMovieFilters(movies, '2020s', ['foreign', '1080p+', 'dual-audio']).map((m) => m.id))
      .toEqual([1]);
    expect(applyMovieFilters(movies, 'any', [])).toHaveLength(3);
  });

  it('matches an exact year from the loaded titles', () => {
    expect(matchesYear(movie({ year: 2024 }), '2024')).toBe(true);
    expect(matchesYear(movie({ year: 2023 }), '2024')).toBe(false);
    expect(matchesYear(movie({ year: null }), '2024')).toBe(false);
  });

  it('lists every real year once, descending', () => {
    const movies = [
      movie({ id: 1, year: 2019 }),
      movie({ id: 2, year: 2024 }),
      movie({ id: 3, year: 2019 }),
      movie({ id: 4, year: null }),
    ];
    expect(getAvailableYears(movies)).toEqual([2024, 2019]);
  });
});
