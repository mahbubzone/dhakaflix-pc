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

export function useMovies(options: UseMoviesOptions = {}): UseMoviesResult {
  const { category: rawCategory, kind, limit = 24, sortBy = 'added', sortOrder = 'desc' } = options;
  
  // Handle special category values
  const category = rawCategory === '__movies__' || rawCategory === '__series__' || rawCategory === '__recent__'
    ? undefined
    : rawCategory;
  
  // Override kind for movies/series views
  const effectiveKind = rawCategory === '__movies__' ? 0 
    : rawCategory === '__series__' ? 1 
    : kind;

  // Documentaries and award-show specials have their own tabs; they must not
  // leak into Movies or Series even though the crawler tags both as kind 0.
  const excludeCategories = rawCategory === '__movies__' || rawCategory === '__series__'
    ? ['Documentary', 'Awards & TV Shows']
    : undefined;

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
  }, [category, excludeCategories, effectiveKind, limit, sortBy, sortOrder]);

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
