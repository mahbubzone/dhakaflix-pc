import { firstTrailerId } from '../renderer/components/media/TrailerEmbed';
import {
  applyFavoriteMembership,
  favoriteCountFrom,
} from '../renderer/hooks/useFavorite';
import {
  nextWatchedFlag,
  watchedFromProgress,
  withWatchedFlag,
} from '../renderer/hooks/useWatched';
import { mediaKindLabel } from '../renderer/utils/metadata';

describe('media kind label', () => {
  it('labels documentaries by category, not by movie kind', () => {
    expect(mediaKindLabel({ kind: 0, category: 'Documentary' })).toBe('Documentary');
    expect(mediaKindLabel({ kind: 0, category: 'English Movies' })).toBe('Movie');
    expect(mediaKindLabel({ kind: 1, category: 'TV & Web Series' })).toBe('Series');
    expect(mediaKindLabel({ kind: 2, category: 'Awards & TV Shows' })).toBe('Event');
  });
});

describe('favorite membership helpers', () => {
  it('adds once, removes and never duplicates', () => {
    const empty = new Set<number>();
    const added = applyFavoriteMembership(empty, 7, true);
    expect([...added]).toEqual([7]);
    expect([...empty]).toEqual([]);
    expect([...applyFavoriteMembership(added, 7, true)]).toEqual([7]);
    expect([...applyFavoriteMembership(added, 7, false)]).toEqual([]);
    expect(favoriteCountFrom(added)).toBe(1);
  });
});

describe('trailer id parsing', () => {
  it('accepts only a real YouTube id from stored JSON', () => {
    expect(firstTrailerId('[{"youtubeId":"dQw4w9WgXcQ","type":"Trailer"}]')).toBe('dQw4w9WgXcQ');
    expect(firstTrailerId('[{"youtubeId":"short"}]')).toBeNull();
    expect(firstTrailerId('not json')).toBeNull();
    expect(firstTrailerId(null)).toBeNull();
  });
});

describe('watched helpers', () => {
  it('maps the current state to an explicit 0 or 1 flag', () => {
    expect(nextWatchedFlag(false)).toBe(1);
    expect(nextWatchedFlag(true)).toBe(0);
  });

  it('reads watched only from a real progress row', () => {
    expect(watchedFromProgress({ position: 0, duration: 0, watched: 1 })).toBe(true);
    expect(watchedFromProgress({ position: 120, duration: 300, watched: 0 })).toBe(false);
    expect(watchedFromProgress(null)).toBe(false);
    expect(watchedFromProgress(undefined)).toBe(false);
  });

  it('flips the flag without losing saved progress', () => {
    const row = { position: 120, duration: 300, watched: 1 };
    expect(withWatchedFlag(row, 0)).toEqual({ position: 120, duration: 300, watched: 0 });
    expect(row).toEqual({ position: 120, duration: 300, watched: 1 });
    expect(withWatchedFlag(null, 1)).toEqual({ position: 0, duration: 0, watched: 1 });
  });
});
