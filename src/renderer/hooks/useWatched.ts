/**
 * Watched state for one library href.
 *
 * Watched is a reversible flag written through db:setWatched(0|1). Progress is
 * read only from the real getProgress row; live player events refresh it, and
 * a generation counter drops stale reads. Pure helpers stay testable in node.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Progress } from '../types';

export interface WatchedMutation {
  ok: boolean;
  watched: 0 | 1;
  error: string | null;
}

export interface UseWatchedResult {
  progress: Progress | null;
  watched: boolean;
  loading: boolean;
  trackingUnavailable: boolean;
  refresh: () => Promise<void>;
  toggle: () => Promise<WatchedMutation>;
}

/** Explicit 0/1 only; no truthy coercion. */
export function nextWatchedFlag(watched: boolean): 0 | 1 {
  return watched ? 0 : 1;
}

export function watchedFromProgress(progress: Progress | null | undefined): boolean {
  return progress?.watched === 1;
}

/** Flip only the flag; saved position, duration and episode stay untouched. */
export function withWatchedFlag(progress: Progress | null, watched: 0 | 1): Progress {
  if (progress) return { ...progress, watched };
  return { position: 0, duration: 0, watched };
}

export function useWatched(href: string, movieId?: number): UseWatchedResult {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(false);
  const [trackingUnavailable, setTrackingUnavailable] = useState(false);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!href) return;
    const token = ++generation.current;
    setLoading(true);
    try {
      const value = await window.api.db.getProgress(href);
      if (generation.current !== token) return;
      setProgress(value ?? null);
    } catch {
      if (generation.current === token) setProgress(null);
    } finally {
      if (generation.current === token) setLoading(false);
    }
  }, [href]);

  useEffect(() => {
    generation.current++;
    setProgress(null);
    setTrackingUnavailable(false);
    void refresh();
  }, [refresh]);

  // Live VLC progress for this title only. No polling and no global remount.
  useEffect(() => {
    const matches = (event: { movieId: number | null; href: string | null }) =>
      (movieId !== undefined && event.movieId === movieId) || (!!href && event.href === href);

    const offProgress = window.api.player.onProgress((event) => {
      if (matches(event)) void refresh();
    });
    const offUnavailable = window.api.player.onProgressUnavailable((info) => {
      if (matches(info)) setTrackingUnavailable(true);
    });
    return () => {
      offProgress();
      offUnavailable();
    };
  }, [href, movieId, refresh]);

  const toggle = useCallback(async (): Promise<WatchedMutation> => {
    if (!href) {
      return { ok: false, watched: 0, error: 'Missing href' };
    }
    const flag = nextWatchedFlag(watchedFromProgress(progress));
    const result = await window.api.db.setWatched(href, flag);
    if (result.ok) {
      // Drop any read already in flight before applying the authoritative flag.
      generation.current++;
      setProgress((previous) => withWatchedFlag(previous, result.watched));
      setLoading(false);
    }
    return result;
  }, [href, progress]);

  return {
    progress,
    watched: watchedFromProgress(progress),
    loading,
    trackingUnavailable,
    refresh,
    toggle,
  };
}
