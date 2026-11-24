/**
 * useMetadata Hook
 *
 * Cached metadata first. A network lookup starts only after the title stays
 * mounted for 350 ms, so scrolling past posters fires no Cinemeta requests.
 * Unmount cancels the timer and ignores late IPC replies.
 */

import { useEffect, useState } from 'react';
import { isMetadataUsable } from '../utils/metadata';
import { invalidateCachedMetadata } from './useCatalogMetadata';
import type { Metadata, Movie } from '../types';

export interface UseMetadataResult {
  metadata: Metadata | null;
  loading: boolean;
}

export function useMetadata(movie: Movie | null | undefined, delayMs = 350): UseMetadataResult {
  const movieId = movie?.id;
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!movieId) {
      setMetadata(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    setMetadata(null);
    setLoading(true);

    const fetchRemote = () => {
      window.api.meta
        .get(movieId)
        .then((result) => {
          if (cancelled || !result.ok || !isMetadataUsable(result.data)) return;
          // A focused lookup can resolve a previous catalog miss.
          invalidateCachedMetadata(movieId);
          setMetadata(result.data);
        })
        .catch(() => {
          // Metadata is optional; the library title remains fully usable.
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    window.api.meta
      .getCached(movieId)
      .then((result) => {
        if (cancelled) return;
        if (result.ok && isMetadataUsable(result.data)) {
          setMetadata(result.data);
          setLoading(false);
          return;
        }
        timer = setTimeout(fetchRemote, delayMs);
      })
      .catch(() => {
        if (cancelled) return;
        timer = setTimeout(fetchRemote, delayMs);
      });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [movieId, delayMs]);

  return { metadata, loading };
}
