/**
 * Category View
 * 
 * Grid view of all movies in a category.
 */

import React, { useState, useCallback } from 'react';
import PosterGrid from '../components/media/PosterGrid';
import { useMovies } from '../hooks/useMovies';
import type { Movie } from '../types';
import './Category.css';

interface CategoryProps {
  category: string;
  onMovieSelect: (movie: Movie) => void;
  onBack: () => void;
}

type SortOption = 'added' | 'title' | 'year';

export default function Category({ category, onMovieSelect, onBack }: CategoryProps) {
  const [sortBy, setSortBy] = useState<SortOption>('added');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const isRecent = category === '__recent__';
  const displayName = isRecent
    ? 'Recently Added'
    : category === '__movies__'
      ? 'Movies'
      : category === '__series__'
        ? 'Series'
        : category;

  const { movies, total, loading, loadMore, hasMore } = useMovies({
    category: isRecent ? undefined : category,
    limit: 48,
    sortBy,
    sortOrder,
  });

  const handleSortChange = useCallback((newSort: SortOption) => {
    if (newSort === sortBy) {
      // Toggle order
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(newSort);
      setSortOrder(newSort === 'title' ? 'asc' : 'desc');
    }
  }, [sortBy]);

  return (
    <div className="category">
      <header className="category__header">
        <button className="category__back" onClick={onBack}>
          ← Back
        </button>
        <div className="category__title-row">
          <h1 className="category__title">{displayName}</h1>
          <span className="category__count">{total.toLocaleString()} titles</span>
        </div>
        <div className="category__sort">
          <span className="category__sort-label">Sort by:</span>
          <button
            className={`category__sort-btn ${sortBy === 'added' ? 'active' : ''}`}
            onClick={() => handleSortChange('added')}
          >
            Date Added {sortBy === 'added' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
          <button
            className={`category__sort-btn ${sortBy === 'title' ? 'active' : ''}`}
            onClick={() => handleSortChange('title')}
          >
            Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            className={`category__sort-btn ${sortBy === 'year' ? 'active' : ''}`}
            onClick={() => handleSortChange('year')}
          >
            Year {sortBy === 'year' && (sortOrder === 'desc' ? '↓' : '↑')}
          </button>
        </div>
      </header>

      <PosterGrid
        movies={movies}
        onMovieClick={onMovieSelect}
        loading={loading}
        onLoadMore={loadMore}
        hasMore={hasMore}
      />
    </div>
  );
}
