/**
 * useSources Hook
 * 
 * Manages ISP server sources.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Source } from '../types';

interface UseSourcesResult {
  sources: Source[];
  loading: boolean;
  error: string | null;
  addSource: (name: string, baseUrl: string) => Promise<Source>;
  removeSource: (id: number) => Promise<void>;
  testSource: (baseUrl: string) => Promise<{ ok: boolean; format: string | null; error?: string }>;
  refresh: () => void;
}

export function useSources(): UseSourcesResult {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(() => {
    setLoading(true);
    window.api.sources.getAll()
      .then((items) => {
        setSources(items);
        setError(null);
      })
      .catch((cause: Error) => setError(cause.message || 'Could not load sources.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const addSource = useCallback(async (name: string, baseUrl: string): Promise<Source> => {
    const source = await window.api.sources.add({ name, baseUrl });
    setSources((prev) => [...prev, source]);
    setError(null);
    return source;
  }, []);

  const removeSource = useCallback(async (id: number) => {
    await window.api.sources.remove(id);
    setSources((prev) => prev.filter((s) => s.id !== id));
    setError(null);
  }, []);

  const testSource = useCallback(async (baseUrl: string) => {
    return window.api.sources.test(baseUrl);
  }, []);

  return {
    sources,
    loading,
    error,
    addSource,
    removeSource,
    testSource,
    refresh: fetchSources,
  };
}
