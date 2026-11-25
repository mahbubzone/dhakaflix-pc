/**
 * Search Modal
 *
 * Fixed-size centered modal. Head, count line and filter bar never change
 * height; only the result stage scrolls. Clicking a result opens Detail.
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
const SKELETON_POSTERS = 12;

export default function Search({ onMovieSelect, onClose, query, onQueryChange }: SearchProps) {
  const { query: localQuery, setQuery, results, loading, hasQuery } = useSearch(300);
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const inputRef = useRef<HTMLInputElement>(null);

  const externalQuery = query ?? '';
  const hasResults = results.length > 0;

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
  const showSkeleton = !hasQuery || loading || !hasResults;

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
      <div
        className="search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Search library"
        data-testid="search-modal"
      >
        <div className="search-modal__head">
          <div className="search__input-wrap">
            <svg
              className="search__icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={inputRef}
              className="search__input"
              type="search"
              value={localQuery}
              placeholder="Search movies and series..."
              aria-label="Search movies and series"
              data-testid="search-input"
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
          <div className="search__count">
            {hasQuery && hasResults
              ? `${filtered.length} result${filtered.length === 1 ? '' : 's'} for “${localQuery}”`
              : 'Search results'}
          </div>

          <FilterBar
            filters={filters}
            onChange={setFilters}
            genres={genres}
            years={years}
            count={filtered.length}
            disabled={!hasResults}
          />

          <div className="search__stage">
            {showSkeleton ? (
              <div className="poster-grid" aria-hidden="true">
                {Array.from({ length: SKELETON_POSTERS }, (_, index) => (
                  <div key={index} className="poster-grid__skeleton" />
                ))}
              </div>
            ) : (
              <>
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

            {showSkeleton && (
              <div className="search__stage-copy">
                {!hasQuery ? (
                  <>
                    <span className="search__empty-icon" aria-hidden="true">🔍</span>
                    <p>Search for movies and TV series</p>
                    <p className="search__hint">Try a title, year or actor name</p>
                  </>
                ) : loading ? (
                  <>
                    <div className="search__spinner" />
                    <p>Searching...</p>
                  </>
                ) : (
                  <>
                    <span className="search__empty-icon" aria-hidden="true">🤷</span>
                    <p>No results for “{localQuery}”</p>
                    <p className="search__hint">Try different keywords or check the spelling</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
