/**
 * Category View
 *
 * Grid of real DB titles with the shared filter bar and load-more.
 */

import React, { useMemo, useState } from 'react';
import FilterBar from '../components/media/FilterBar';
import PosterGrid from '../components/media/PosterGrid';
import { useMovies } from '../hooks/useMovies';
import { useCatalogMetadata } from '../hooks/useCatalogMetadata';
import {
  applyCatalogFilters,
  DEFAULT_CATALOG_FILTERS,
  getAvailableYears,
  type CatalogFilters,
} from '../utils/filters';
import { parseGenres } from '../utils/metadata';
import type { Movie } from '../types';
import './Category.css';

interface CategoryProps {
  category: string;
  onMovieSelect: (movie: Movie) => void;
}

export default function Category({ category, onMovieSelect }: CategoryProps) {
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);

  const isRecent = category === '__recent__';

  const { movies, loading, loadMore, hasMore } = useMovies({
    category: isRecent ? undefined : category,
    limit: 48,
    sortBy: 'added',
    sortOrder: 'desc',
  });

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
    <div className="category">
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
        loading={loading}
        onLoadMore={loadMore}
        hasMore={hasMore}
        metaById={metaById}
      />
    </div>
  );
}
