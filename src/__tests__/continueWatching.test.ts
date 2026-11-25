import {
  applyContinueWatchingEvent,
  isWatchedProgress,
  type ProgressEvent,
} from '../renderer/utils/continueWatching';
import type { MovieWithProgress } from '../renderer/types';

const movie = (id: number, href: string): MovieWithProgress => ({
  id,
  href,
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
  position: 30,
  duration: 100,
});

const event = (overrides: Partial<ProgressEvent> = {}): ProgressEvent => ({
  movieId: 1,
  href: '/movie-1',
  position: 45,
  duration: 100,
  state: 'playing',
  ...overrides,
});

describe('Continue Watching event updates', () => {
  it('updates an existing row in place without a backend reload', () => {
    const result = applyContinueWatchingEvent([movie(1, '/movie-1')], event(), new Set(['/movie-1']));
    expect(result.changed).toBe(true);
    expect(result.needsFullRefresh).toBe(false);
    expect(result.watching[0].position).toBe(45);
  });

  it('removes a row and requests a reload when the watched ratio is crossed', () => {
    const result = applyContinueWatchingEvent(
      [movie(1, '/movie-1')],
      event({ position: 96 }),
      new Set(['/movie-1'])
    );
    expect(result.watching).toHaveLength(0);
    expect(result.needsFullRefresh).toBe(true);
  });

  it('requests one reload when a known movie enters the rail', () => {
    const result = applyContinueWatchingEvent([], event(), new Set(['/movie-1']));
    expect(result.changed).toBe(false);
    expect(result.needsFullRefresh).toBe(true);
  });

  it('ignores episode hrefs and unknown or invalid events', () => {
    const episode = event({ href: '/series/s01e01' });
    expect(applyContinueWatchingEvent([], episode, new Set(['/movie-1'])).needsFullRefresh).toBe(false);
    expect(applyContinueWatchingEvent([], event({ position: null }), new Set(['/movie-1'])).changed).toBe(false);
    expect(applyContinueWatchingEvent([], event({ duration: 0 }), new Set(['/movie-1'])).changed).toBe(false);
  });

  it('keeps early-stopped titles in the rail', () => {
    expect(isWatchedProgress(30, 100)).toBe(false);
    expect(isWatchedProgress(95, 100)).toBe(true);
    expect(isWatchedProgress(null, 100)).toBe(false);
  });
});
