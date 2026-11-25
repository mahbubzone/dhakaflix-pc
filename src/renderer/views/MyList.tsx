/**
 * Watchlist View
 *
 * Dedicated watchlist page. Mirrors Category: header, shared filters and the
 * poster grid. Content comes only from the persisted watchlist.
 */

import React, { useMemo, useState } from 'react';
import FilterBar from '../components/media/FilterBar';
import PosterGrid from '../components/media/PosterGrid';
import { useWatchlist } from '../hooks/useWatchlist';
import { useCatalogMetadata } from '../hooks/useCatalogMetadata';
import {
  applyCatalogFilters,
  DEFAULT_CATALOG_FILTERS,
  getAvailableYears,
  type CatalogFilters,
} from '../utils/filters';
import { parseGenres } from '../utils/metadata';
import type { Movie } from '../types';
import './MyList.css';

interface MyListProps {
  onMovieSelect: (movie: Movie) => void;
}

export default function MyList({ onMovieSelect }: MyListProps) {
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const {
    movies,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  } = useWatchlist();

  const metaById = useCatalogMetadata(movies);
  const genres = useMemo(() => {
    const values = new Set<string>();
    for (const metadata of metaById.values()) {
      for (const genre of parseGenres(metadata.genres)) values.add(genre);
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [metaById]);

  const filtered = useMemo(
    () => applyCatalogFilters(movies, filters, metaById),
    [movies, filters, metaById]
  );
  const years = useMemo(() => getAvailableYears(movies), [movies]);

  return (
    <div className="mylist">
      {movies.length === 0 && !loading ? (
        <div className="mylist__empty">
          <span className="mylist__empty-icon" aria-hidden="true">☆</span>
          <h2>Your list is empty</h2>
          <p>Use the ＋ button on any poster to save a title here.</p>
        </div>
      ) : (
        <>
          <FilterBar
            filters={filters}
            onChange={setFilters}
            genres={genres}
            years={years}
            count={filtered.length}
          />
          <PosterGrid
            movies={filtered}
            onMovieClick={onMovieSelect}
            loading={loading || loadingMore}
            onLoadMore={hasMore ? loadMore : undefined}
            hasMore={hasMore}
            metaById={metaById}
            emptyLabel="No titles match these filters"
          />
        </>
      )}
    </div>
  );
}
