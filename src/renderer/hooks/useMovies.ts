/**
 * useMovies Hook
 * 
 * Fetches and manages movie data from the database.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Movie, MovieWithProgress, CategoryCount } from '../types';

interface UseMoviesOptions {
  category?: string;
  kind?: 0 | 1;
  limit?: number;
  /** Exact release year, filtered in SQL so totals and paging stay correct. */
  year?: number;
  /** Minimum cached IMDb rating; filtered in SQL over the metadata cache. */
  ratingMin?: number;
  sortBy?: 'added' | 'title' | 'year';
  sortOrder?: 'asc' | 'desc';
}

interface UseMoviesResult {
  movies: Movie[];
  total: number;
  loading: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  hasMore: boolean;
}

/** Stable arrays: a fresh literal each render would restart the fetch effect. */
const SPECIAL_EXCLUDED = ['Documentary', 'Awards & TV Shows'];

/** Shared scope rules for the Movies/Series pseudo-categories. */
function resolveScope(rawCategory: string | undefined, kind: 0 | 1 | undefined) {
  const special = rawCategory === '__movies__' || rawCategory === '__series__';
  return {
    category: special || rawCategory === '__recent__' ? undefined : rawCategory,
    kind: rawCategory === '__movies__' ? 0 as const
      : rawCategory === '__series__' ? 1 as const
        : kind,
    excludeCategories: special ? SPECIAL_EXCLUDED : undefined,
  };
}

export function useMovies(options: UseMoviesOptions = {}): UseMoviesResult {
  const { category: rawCategory, kind, limit = 24, year, ratingMin, sortBy = 'added', sortOrder = 'desc' } = options;
  const { category, kind: effectiveKind, excludeCategories } = resolveScope(rawCategory, kind);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovies = useCallback(async (newOffset: number, append: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.api.db.getMovies({
        category,
        excludeCategories,
        kind: effectiveKind,
        year,
        ratingMin,
        limit,
        offset: newOffset,
        sortBy,
        sortOrder,
      });

      if (append) {
        setMovies((prev) => [...prev, ...result.movies]);
      } else {
        setMovies(result.movies);
      }
      setTotal(result.total);
      setOffset(newOffset);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [category, excludeCategories, effectiveKind, year, ratingMin, limit, sortBy, sortOrder]);

  // Initial fetch
  useEffect(() => {
    fetchMovies(0, false);
  }, [fetchMovies]);

  const loadMore = useCallback(() => {
    if (!loading && movies.length < total) {
      fetchMovies(offset + limit, true);
    }
  }, [loading, movies.length, total, offset, limit, fetchMovies]);

  const refresh = useCallback(() => {
    fetchMovies(0, false);
  }, [fetchMovies]);

  return {
    movies,
    total,
    loading,
    error,
    loadMore,
    refresh,
    hasMore: movies.length < total,
  };
}

/**
 * Every real release year in a catalogue scope, newest first.
 *
 * The list comes from SQL, not from the loaded page, so selecting a year does
 * not collapse the dropdown to that one option.
 */
export function useCatalogYears(rawCategory?: string, kind?: 0 | 1): number[] {
  const [years, setYears] = useState<number[]>([]);
  const { category, kind: effectiveKind, excludeCategories } = resolveScope(rawCategory, kind);

  useEffect(() => {
    let cancelled = false;
    window.api.db.getYears({ category, excludeCategories, kind: effectiveKind })
      .then((list) => {
        if (!cancelled) setYears(list);
      })
      .catch(() => {
        if (!cancelled) setYears([]);
      });
    return () => {
      cancelled = true;
    };
  }, [category, excludeCategories, effectiveKind]);

  return years;
}

/**
 * useSearch Hook
 * 
 * Debounced search with results.
 */
export function useSearch(debounceMs = 300) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    window.api.db.searchMovies(debouncedQuery, 50)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  return {
    query,
    setQuery,
    results,
    loading,
    hasQuery: query.trim().length > 0,
  };
}

/**
 * useContinueWatching Hook
 */
export function useContinueWatching(limit = 10) {
  const [movies, setMovies] = useState<MovieWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.api.db.getContinueWatching(limit)
      .then(setMovies)
      .catch(() => setMovies([]))
      .finally(() => setLoading(false));
  }, [limit]);

  const refresh = useCallback(() => {
    setLoading(true);
    window.api.db.getContinueWatching(limit)
      .then(setMovies)
      .finally(() => setLoading(false));
  }, [limit]);

  return { movies, loading, refresh };
}

/**
 * useCategories Hook
 */
export function useCategories() {
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.api.db.getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
}
