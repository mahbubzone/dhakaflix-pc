/**
 * Category View
 *
 * Grid of real DB titles with the shared filter bar and load-more.
 */

import React, { useMemo, useState } from 'react';
import FilterBar from '../components/media/FilterBar';
import PosterGrid from '../components/media/PosterGrid';
import { useCatalogYears, useMovies } from '../hooks/useMovies';
import { useCatalogMetadata } from '../hooks/useCatalogMetadata';
import {
  DEFAULT_CATALOG_FILTERS,
  applyCatalogFilters,
  getAvailableYears,
} from '../utils/filters';
import { parseGenres } from '../utils/metadata';
import type { Movie } from '../types';
import './Category.css';

interface CategoryProps {
  category: string;
  onMovieSelect: (movie: Movie) => void;
}

export default function Category({ category, onMovieSelect }: CategoryProps) {
  const [filters, setFilters] = useState(DEFAULT_CATALOG_FILTERS);

  const isRecent = category === '__recent__';

  // Exact years filter in SQL. A decade value never reaches this view, but the
  // guard keeps the IPC argument a real number.
  const exactYear = /^\d{4}$/.test(filters.year) ? Number(filters.year) : undefined;
  // Ratings filter in SQL over the metadata cache; 'all' keeps every title.
  const ratingMin = filters.rating === 'all' ? undefined : Number(filters.rating);

  const { movies, total, loading, loadMore, hasMore } = useMovies({
    category: isRecent ? undefined : category,
    year: exactYear,
    ratingMin,
    limit: 24,
    sortBy: 'added',
    sortOrder: 'desc',
  });

  const catalogYears = useCatalogYears(category);

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
  const years = useMemo(() => {
    const merged = new Set([...catalogYears, ...getAvailableYears(movies)]);
    return [...merged].sort((a, b) => b - a);
  }, [catalogYears, movies]);

  // Genre/quality/audio are still applied to loaded rows, so their count is a
  // loaded-page count. Year and rating filter in SQL, which makes the backend
  // total exact for the visible scope.
  const clientSideFilters = filters.genre !== ''
    || filters.quality !== 'any'
    || filters.audio !== 'any';
  const resultCount = clientSideFilters ? filtered.length : total;

  return (
    <div className="category">
      <FilterBar
        filters={filters}
        onChange={setFilters}
        genres={genres}
        years={years}
        count={resultCount}
      />

      <PosterGrid
        movies={filtered}
        onMovieClick={onMovieSelect}
        loading={loading}
        onLoadMore={loadMore}
        hasMore={hasMore}
        metaById={metaById}
      />
    </div>
  );
}
