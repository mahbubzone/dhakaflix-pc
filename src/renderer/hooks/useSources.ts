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
  addSource: (name: string, baseUrl: string) => Promise<Source>;
  removeSource: (id: number) => Promise<void>;
  testSource: (baseUrl: string) => Promise<{ ok: boolean; format: string | null; error?: string }>;
  refresh: () => void;
}

export function useSources(): UseSourcesResult {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSources = useCallback(() => {
    setLoading(true);
    window.api.sources.getAll()
      .then(setSources)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const addSource = useCallback(async (name: string, baseUrl: string): Promise<Source> => {
    const source = await window.api.sources.add({ name, baseUrl });
    setSources((prev) => [...prev, source]);
    return source;
  }, []);

  const removeSource = useCallback(async (id: number) => {
    await window.api.sources.remove(id);
    setSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const testSource = useCallback(async (baseUrl: string) => {
    return window.api.sources.test(baseUrl);
  }, []);

  return {
    sources,
    loading,
    addSource,
    removeSource,
    testSource,
    refresh: fetchSources,
  };
}
