/**
 * Shared favorite state.
 *
 * Favorites are independent of the watchlist. A module-level store keeps every
 * mounted consumer in sync with the persisted ids; only real backend results
 * change membership. Pure helpers are exported for focused unit tests.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';

interface FavoriteState {
  ids: ReadonlySet<number>;
  count: number;
  loading: boolean;
  error: string | null;
}

type FavoriteListener = () => void;
type FavoriteMutation = { ok: boolean; favorite: boolean; error: string | null };

let state: FavoriteState = {
  ids: new Set<number>(),
  count: 0,
  loading: false,
  error: null,
};

const listeners = new Set<FavoriteListener>();
const pending = new Set<number>();
let loadInFlight: Promise<void> | null = null;
let generation = 0;

/** One mutation per movie: a second toggle cannot race the first reply. */
async function withPending<T extends FavoriteMutation>(
  movieId: number,
  run: () => Promise<T>
): Promise<T> {
  if (pending.has(movieId)) {
    return {
      ok: false,
      favorite: state.ids.has(movieId),
      error: 'Favorite update in progress',
    } as T;
  }
  pending.add(movieId);
  try {
    return await run();
  } finally {
    pending.delete(movieId);
  }
}

function publish(next: FavoriteState): void {
  state = next;
  for (const listener of listeners) listener();
}

/** Pure membership update shared by every successful mutation. */
export function applyFavoriteMembership(
  ids: ReadonlySet<number>,
  movieId: number,
  favorite: boolean
): ReadonlySet<number> {
  const next = new Set(ids);
  if (favorite) next.add(movieId);
  else next.delete(movieId);
  return next;
}

export function favoriteCountFrom(ids: ReadonlySet<number>): number {
  return ids.size;
}

export function subscribeFavorite(listener: FavoriteListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      generation++;
      loadInFlight = null;
    }
  };
}

export function getFavoriteSnapshot(): FavoriteState {
  return state;
}

export async function refreshFavorite(): Promise<void> {
  const token = ++generation;
  publish({ ...state, loading: true, error: null });
  try {
    const result = await window.api.favorite.get();
    if (token !== generation) return;
    const ids = new Set(result.ok && result.favorite ? result.favorite.ids : []);
    publish({
      ids,
      count: result.ok && result.favorite ? result.favorite.count : ids.size,
      loading: false,
      error: result.ok ? null : result.error,
    });
  } catch (error) {
    if (token !== generation) return;
    publish({ ...state, loading: false, error: (error as Error).message });
  }
}

export function ensureFavoriteLoaded(): Promise<void> {
  if (!loadInFlight) {
    loadInFlight = refreshFavorite().finally(() => {
      loadInFlight = null;
    });
  }
  return loadInFlight;
}

function applyMutation(movieId: number, favorite: boolean): void {
  const ids = applyFavoriteMembership(state.ids, movieId, favorite);
  generation++;
  publish({
    ids,
    count: favoriteCountFrom(ids),
    loading: false,
    error: null,
  });
}

export async function addFavorite(movieId: number): Promise<FavoriteMutation> {
  return withPending(movieId, async () => {
    const result = await window.api.favorite.add(movieId);
    if (result.ok) applyMutation(movieId, result.favorite);
    return result;
  });
}

export async function removeFavorite(movieId: number): Promise<FavoriteMutation> {
  return withPending(movieId, async () => {
    const result = await window.api.favorite.remove(movieId);
    if (result.ok) applyMutation(movieId, result.favorite);
    return result;
  });
}

export async function toggleFavorite(movieId: number): Promise<FavoriteMutation> {
  return withPending(movieId, async () => {
    const result = await window.api.favorite.toggle(movieId);
    if (result.ok) applyMutation(movieId, result.favorite);
    return result;
  });
}

export async function isFavorite(movieId: number): Promise<boolean> {
  if (pending.has(movieId)) return state.ids.has(movieId);
  pending.add(movieId);
  const token = generation;
  try {
    const result = await window.api.favorite.has(movieId);
    // A newer mutation or refresh invalidates a stale has() reply.
    if (result.ok && token === generation) applyMutation(movieId, result.favorite);
    return result.ok && result.favorite;
  } finally {
    pending.delete(movieId);
  }
}

/** Full shared view for the detail icon and any future favorites view. */
export function useFavorite() {
  const snapshot = useSyncExternalStore(
    subscribeFavorite,
    getFavoriteSnapshot,
    getFavoriteSnapshot
  );

  useEffect(() => {
    void ensureFavoriteLoaded();
  }, []);

  const add = useCallback((movieId: number) => addFavorite(movieId), []);
  const remove = useCallback((movieId: number) => removeFavorite(movieId), []);
  const toggle = useCallback((movieId: number) => toggleFavorite(movieId), []);
  const has = useCallback((movieId: number) => isFavorite(movieId), []);

  return {
    ids: snapshot.ids,
    count: snapshot.count,
    loading: snapshot.loading,
    error: snapshot.error,
    add,
    remove,
    toggle,
    has,
    refresh: refreshFavorite,
  };
}

/** Per-title subscription: one icon re-renders only when its own flag changes. */
export function useIsFavorite(movieId: number): boolean {
  const favorite = useSyncExternalStore(
    subscribeFavorite,
    () => state.ids.has(movieId),
    () => false
  );

  useEffect(() => {
    void ensureFavoriteLoaded();
  }, []);

  return favorite;
}
