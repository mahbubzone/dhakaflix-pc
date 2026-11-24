/**
 * Cached metadata for a set of loaded titles.
 *
 * Reads only the Cinemeta cache (already fetched by the backend), never
 * triggers a network lookup from a grid card. Only usable rows are cached:
 * misses are retried until a focused useMetadata lookup succeeds.
 */

import { useEffect, useState } from 'react';
import { isMetadataUsable } from '../utils/metadata';
import type { Metadata, Movie } from '../types';

const cache = new Map<number, Metadata>();
const listeners = new Set<(id: number) => void>();

/** Drop a cached miss and make mounted catalog hooks re-read this title. */
export function invalidateCachedMetadata(movieId: number): void {
  cache.delete(movieId);
  for (const listener of listeners) listener(movieId);
}

export function useCatalogMetadata(movies: readonly Movie[]): Map<number, Metadata> {
  const [metaById, setMetaById] = useState<Map<number, Metadata>>(new Map());
  const idsKey = movies.map((movie) => movie.id).join(',');

  useEffect(() => {
    let cancelled = false;
    let generation = 0;

    if (!idsKey) {
      setMetaById(new Map());
      return;
    }

    const ids = idsKey
      .split(',')
      .map(Number)
      .filter((id) => Number.isFinite(id));

    const load = () => {
      const current = ++generation;
      Promise.all(ids.map(async (id): Promise<readonly [number, Metadata] | null> => {
        const cached = cache.get(id);
        if (cached) return [id, cached];

        try {
          const result = await window.api.meta.getCached(id);
          if (!result.ok || !isMetadataUsable(result.data)) return null;
          cache.set(id, result.data);
          return [id, result.data];
        } catch {
          // A miss or IPC error is never cached as a permanent null.
          return null;
        }
      })).then((entries) => {
        if (cancelled || current !== generation) return;
        const next = new Map<number, Metadata>();
        for (const entry of entries) {
          if (entry) next.set(entry[0], entry[1]);
        }
        setMetaById(next);
      });
    };

    load();
    const onInvalidate = (id: number) => {
      if (ids.includes(id)) load();
    };
    listeners.add(onInvalidate);

    return () => {
      cancelled = true;
      generation++;
      listeners.delete(onInvalidate);
    };
  }, [idsKey]);

  return metaById;
}
