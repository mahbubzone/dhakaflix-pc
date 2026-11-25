import {
  appendWatchlistPage,
  applyWatchlistMembership,
  mergeWatchlistMovies,
} from '../renderer/hooks/useWatchlist';
import {
  formatPosition,
  formatRemaining,
  progressPercent,
} from '../renderer/utils/format';
import type { Movie } from '../renderer/types';

const movie = (id: number): Movie => ({
  id,
  href: `/movie-${id}`,
  parent: null,
  source_id: 1,
  category: 'English Movies',
  title: `Movie ${id}`,
  year: 2020,
  quality: '1080p',
  dual_audio: 0,
  kind: 0,
  poster: null,
  video: null,
  size: 0,
  added: 1000,
  seen: 0,
});

describe('watchlist state helpers', () => {
  it('adds and removes membership without mutating the input set', () => {
    const original = new Set([1, 2]);
    const added = applyWatchlistMembership(original, 3, true);
    expect([...added].sort()).toEqual([1, 2, 3]);
    expect([...original]).toEqual([1, 2]);
    expect([...applyWatchlistMembership(original, 2, false)]).toEqual([1]);
  });

  it('keeps the mounted list consistent with one mutation', () => {
    const first = movie(1);
    const second = movie(2);
    expect(mergeWatchlistMovies([second], first, true).map((item) => item.id)).toEqual([1, 2]);
    expect(mergeWatchlistMovies([first, second], first, false).map((item) => item.id)).toEqual([2]);
  });

  it('appends a page without duplicating titles', () => {
    const first = movie(1);
    const second = movie(2);
    expect(appendWatchlistPage([first], [first, second]).map((item) => item.id)).toEqual([1, 2]);
  });
});

describe('resume formatting', () => {
  it('formats real remaining seconds into readable time', () => {
    expect(formatRemaining(0)).toBe('0 min');
    expect(formatRemaining(undefined)).toBe('0 min');
    expect(formatRemaining(1)).toBe('1 min');
    expect(formatRemaining(90)).toBe('2 min');
    expect(formatRemaining(3600)).toBe('1h');
    expect(formatRemaining(3661)).toBe('1h 1m');
  });

  it('does not display a time for an unknown resume position', () => {
    expect(formatPosition(0)).toBe('');
    expect(formatPosition(-5)).toBe('');
    expect(formatPosition(Number.NaN)).toBe('');
    expect(formatPosition(180)).toBe('3 min');
  });

  it('clamps progress to the displayable range', () => {
    expect(progressPercent(30, 120)).toBe(25);
    expect(progressPercent(200, 100)).toBe(100);
    expect(progressPercent(-1, 100)).toBe(0);
    expect(progressPercent(10, 0)).toBe(0);
  });
});
