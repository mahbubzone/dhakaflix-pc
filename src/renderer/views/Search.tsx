/**
 * Search Modal
 *
 * Centered pop-up opened from the TopNav field or Ctrl/Cmd+K. IPC search stays
 * debounced inside useSearch. Clicking a result opens Detail and closes modal.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import FilterBar from '../components/media/FilterBar';
import PosterGrid from '../components/media/PosterGrid';
import { useSearch } from '../hooks/useMovies';
import { useCatalogMetadata } from '../hooks/useCatalogMetadata';
import {
  applyCatalogFilters,
  DEFAULT_CATALOG_FILTERS,
  getAvailableYears,
  type CatalogFilters,
} from '../utils/filters';
import { parseGenres } from '../utils/metadata';
import type { Movie } from '../types';
import './Search.css';

interface SearchProps {
  onMovieSelect: (movie: Movie) => void;
  onClose: () => void;
  query?: string;
  onQueryChange?: (query: string) => void;
}

const PAGE_SIZE = 30;

export default function Search({ onMovieSelect, onClose, query, onQueryChange }: SearchProps) {
  const { query: localQuery, setQuery, results, loading, hasQuery } = useSearch(300);
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const inputRef = useRef<HTMLInputElement>(null);

  const externalQuery = query ?? '';

  useEffect(() => {
    if (externalQuery !== localQuery) setQuery(externalQuery);
  }, [externalQuery, localQuery, setQuery]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [localQuery]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const metaById = useCatalogMetadata(results);
  const genres = useMemo(() => {
    const values = new Set<string>();
    for (const metadata of metaById.values()) {
      for (const genre of parseGenres(metadata.genres)) values.add(genre);
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [metaById]);
  const years = useMemo(() => getAvailableYears(results), [results]);

  const filtered = useMemo(
    () => applyCatalogFilters(results, filters, metaById),
    [results, filters, metaById]
  );
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleInput = (value: string) => {
    setQuery(value);
    onQueryChange?.(value);
  };

  const handleSelect = (movie: Movie) => {
    onClose();
    onMovieSelect(movie);
  };

  return (
    <div
      className="search-modal__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="search-modal" role="dialog" aria-modal="true" aria-label="Search library">
        <div className="search-modal__head">
          <div className="search__input-wrap">
            <input
              ref={inputRef}
              className="search__input"
              type="search"
              value={localQuery}
              placeholder="Search movies and series..."
              aria-label="Search movies and series"
              autoComplete="off"
              onChange={(event) => handleInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  if (localQuery) handleInput('');
                  else onClose();
                }
              }}
            />
          </div>
          <button
            className="search-modal__close"
            onClick={onClose}
            aria-label="Close search"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="search-modal__body">
          {!hasQuery ? (
            <div className="search__empty">
              <span className="search__empty-icon">🔍</span>
              <p>Search for movies and TV series</p>
              <p className="search__hint">Try a title, year or actor name</p>
            </div>
          ) : loading ? (
            <div className="search__loading">
              <div className="search__spinner" />
              <p>Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="search__empty">
              <span className="search__empty-icon">🤷</span>
              <p>No results for “{localQuery}”</p>
              <p className="search__hint">Try different keywords or check the spelling</p>
            </div>
          ) : (
            <>
              <div className="search__count">
                {filtered.length} result{filtered.length === 1 ? '' : 's'} for “{localQuery}”
              </div>
              <FilterBar
                filters={filters}
                onChange={setFilters}
                genres={genres}
                years={years}
                count={filtered.length}
              />
              <PosterGrid movies={visible} onMovieClick={handleSelect} metaById={metaById} />
              {hasMore && (
                <div className="search__load-more">
                  <button onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
