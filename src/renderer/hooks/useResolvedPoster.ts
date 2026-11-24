/**
 * useResolvedPoster Hook
 *
 * Poster images are not known until a title folder is inspected, so they are
 * resolved on demand. Module-level caches keep repeated cards (the same title
 * can appear in several rows) from firing duplicate requests.
 */

import { useEffect, useState } from 'react';
import type { Movie } from '../types';

const posterCache = new Map<number, string | null>();
const inflight = new Map<number, Promise<string | null>>();

function resolvePoster(movieId: number): Promise<string | null> {
  const pending = inflight.get(movieId);
  if (pending) return pending;

  const request = window.api.media
    .resolve(movieId)
    .then((result) => {
      posterCache.set(movieId, result.poster);
      return result.poster;
    })
    .catch(() => {
      posterCache.set(movieId, null);
      return null;
    })
    .finally(() => {
      inflight.delete(movieId);
    });

  inflight.set(movieId, request);
  return request;
}

export function useResolvedPoster(movie: Movie): string | null {
  const [poster, setPoster] = useState<string | null>(
    movie.poster ?? posterCache.get(movie.id) ?? null
  );

  useEffect(() => {
    if (movie.poster) {
      setPoster(movie.poster);
      return;
    }

    const cached = posterCache.get(movie.id);
    if (cached !== undefined) {
      setPoster(cached);
      return;
    }

    let cancelled = false;
    resolvePoster(movie.id).then((resolved) => {
      if (!cancelled) setPoster(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [movie.id, movie.poster]);

  return poster;
}

/** Drop cached entries, e.g. after a rescan replaces folders. */
export function clearPosterCache(): void {
  posterCache.clear();
  inflight.clear();
}
