/**
 * Shared watchlist state.
 *
 * A module-level store keeps PosterCard, Detail, My List and the nav badge in
 * sync without polling or prop drilling. Only real backend results change the
 * store; optimistic entries are never invented. A generation counter drops
 * stale async results after a newer mutation or a full unmount.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { Movie } from '../types';

interface WatchlistState {
  ids: ReadonlySet<number>;
  movies: Movie[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
}

type WatchlistListener = () => void;

type MutationResult = { ok: boolean; error?: string | null };
type ToggleResult = MutationResult & { watchlisted?: boolean };

const WATCHLIST_PAGE_SIZE = 200;

let state: WatchlistState = {
  ids: new Set<number>(),
  movies: [],
  total: 0,
  loading: false,
  loadingMore: false,
  error: null,
};

const listeners = new Set<WatchlistListener>();
let loadInFlight: Promise<void> | null = null;
let moreInFlight: Promise<void> | null = null;
let generation = 0;

function publish(next: WatchlistState): void {
  state = next;
  for (const listener of listeners) listener();
}

/** Mutations invalidate any refresh or page request already in flight. */
function publishMutation(next: WatchlistState): void {
  generation++;
  publish(next);
}

/** Pure membership update used by every successful mutation. */
export function applyWatchlistMembership(
  ids: ReadonlySet<number>,
  movieId: number,
  watchlisted: boolean
): ReadonlySet<number> {
  const next = new Set(ids);
  if (watchlisted) next.add(movieId);
  else next.delete(movieId);
  return next;
}

/** Keep the mounted My List snapshot consistent with a single mutation. */
export function mergeWatchlistMovies(
  movies: readonly Movie[],
  movie: Movie,
  watchlisted: boolean
): Movie[] {
  const without = movies.filter((item) => item.id !== movie.id);
  return watchlisted ? [movie, ...without] : without;
}

/** Append a real backend page without duplicating titles already loaded. */
export function appendWatchlistPage(
  movies: readonly Movie[],
  page: readonly Movie[]
): Movie[] {
  const seen = new Set(movies.map((movie) => movie.id));
  const appended = page.filter((movie) => {
    if (seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });
  return [...movies, ...appended];
}

export function subscribeWatchlist(listener: WatchlistListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    // No mounted consumer: drop pending results so unmounted views stay quiet.
    if (listeners.size === 0) {
      generation++;
      loadInFlight = null;
      moreInFlight = null;
    }
  };
}

export function getWatchlistSnapshot(): WatchlistState {
  return state;
}

export async function refreshWatchlist(): Promise<void> {
  const token = ++generation;
  publish({ ...state, loading: true, loadingMore: false, error: null });
  try {
    const result = await window.api.watchlist.get(WATCHLIST_PAGE_SIZE, 0);
    if (token !== generation) return;
    publish({
      ids: new Set(result.movies.map((movie) => movie.id)),
      movies: result.movies,
      total: result.total,
      loading: false,
      loadingMore: false,
      error: null,
    });
  } catch (error) {
    if (token !== generation) return;
    publish({ ...state, loading: false, loadingMore: false, error: (error as Error).message });
  }
}

/** One refresh per mount wave; the nav, cards and views all share it. */
export function ensureWatchlistLoaded(): Promise<void> {
  if (!loadInFlight) {
    loadInFlight = refreshWatchlist().finally(() => {
      loadInFlight = null;
    });
  }
  return loadInFlight;
}

/** Fetch the next page for My List. The backend caps pages at 200 titles. */
export function loadMoreWatchlist(): Promise<void> {
  if (moreInFlight || state.loading || state.movies.length >= state.total) {
    return Promise.resolve();
  }

  const token = generation;
  const offset = state.movies.length;
  publish({ ...state, loadingMore: true, error: null });

  moreInFlight = window.api.watchlist.get(WATCHLIST_PAGE_SIZE, offset)
    .then((result) => {
      if (token !== generation) return;
      const movies = appendWatchlistPage(state.movies, result.movies);
      publish({
        ...state,
        ids: new Set(movies.map((movie) => movie.id)),
        movies,
        total: result.total,
        loadingMore: false,
        error: null,
      });
    })
    .catch((error: unknown) => {
      if (token !== generation) return;
      publish({ ...state, loadingMore: false, error: (error as Error).message });
    })
    .finally(() => {
      moreInFlight = null;
    });

  return moreInFlight;
}

function applyMutation(movieId: number, movie: Movie | undefined, watchlisted: boolean): void {
  publishMutation({
    ...state,
    ids: applyWatchlistMembership(state.ids, movieId, watchlisted),
    movies: movie ? mergeWatchlistMovies(state.movies, movie, watchlisted) : state.movies,
    total: Math.max(0, state.total + (watchlisted ? 1 : -1)),
    loadingMore: false,
  });
}

export async function addToWatchlist(movieId: number, movie?: Movie): Promise<MutationResult> {
  const result = await window.api.watchlist.add(movieId);
  if (result.ok && !state.ids.has(movieId)) applyMutation(movieId, movie, true);
  return result;
}

export async function removeFromWatchlist(movieId: number): Promise<MutationResult> {
  const result = await window.api.watchlist.remove(movieId);
  if (result.ok && state.ids.has(movieId)) applyMutation(movieId, undefined, false);
  return result;
}

export async function toggleWatchlist(
  movieId: number,
  movie?: Movie
): Promise<ToggleResult> {
  const result = await window.api.watchlist.toggle(movieId);
  if (result.ok && typeof result.watchlisted === 'boolean') {
    applyMutation(movieId, movie, result.watchlisted);
  }
  return result;
}

export async function isWatchlisted(movieId: number): Promise<boolean> {
  const result = await window.api.watchlist.has(movieId);
  if (result.ok) {
    publishMutation({
      ...state,
      ids: applyWatchlistMembership(state.ids, movieId, result.watchlisted),
    });
  }
  return result.ok && result.watchlisted;
}

/** Full shared view for the nav badge, Detail and My List. */
export function useWatchlist() {
  const snapshot = useSyncExternalStore(
    subscribeWatchlist,
    getWatchlistSnapshot,
    getWatchlistSnapshot
  );

  useEffect(() => {
    void ensureWatchlistLoaded();
  }, []);

  const add = useCallback((movieId: number, movie?: Movie) => addToWatchlist(movieId, movie), []);
  const remove = useCallback((movieId: number) => removeFromWatchlist(movieId), []);
  const toggle = useCallback((movieId: number, movie?: Movie) => toggleWatchlist(movieId, movie), []);
  const has = useCallback((movieId: number) => isWatchlisted(movieId), []);

  return {
    ids: snapshot.ids,
    movies: snapshot.movies,
    total: snapshot.total,
    count: snapshot.total,
    loading: snapshot.loading,
    loadingMore: snapshot.loadingMore,
    hasMore: snapshot.movies.length < snapshot.total,
    error: snapshot.error,
    add,
    remove,
    toggle,
    has,
    refresh: refreshWatchlist,
    loadMore: loadMoreWatchlist,
  };
}

/** Per-card subscription: a card re-renders only when its own flag changes. */
export function useIsWatchlisted(movieId: number): boolean {
  const listed = useSyncExternalStore(
    subscribeWatchlist,
    () => state.ids.has(movieId),
    () => false
  );

  useEffect(() => {
    void ensureWatchlistLoaded();
  }, []);

  return listed;
}
