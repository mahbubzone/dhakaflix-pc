/**
 * PosterGrid Component
 * 
 * Responsive grid of poster cards with virtual scrolling.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import PosterCard from './PosterCard';
import type { Movie } from '../../types';
import './PosterGrid.css';

interface PosterGridProps {
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export default function PosterGrid({
  movies,
  onMovieClick,
  loading = false,
  onLoadMore,
  hasMore = false,
}: PosterGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(5);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Calculate columns based on container width
  const updateColumns = useCallback(() => {
    const width = gridRef.current?.clientWidth || 1000;
    const cardWidth = 176; // 160px card + 16px gap
    setColumns(Math.max(3, Math.floor(width / cardWidth)));
  }, []);

  useEffect(() => {
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [updateColumns]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!onLoadMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loading]);

  if (loading && movies.length === 0) {
    return (
      <div className="poster-grid" ref={gridRef}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="poster-grid__skeleton" />
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="poster-grid__empty">
        <span className="poster-grid__empty-icon">🎬</span>
        <p>No movies found</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="poster-grid"
        ref={gridRef}
        style={{ '--columns': columns } as React.CSSProperties}
      >
        {movies.map((movie) => (
          <PosterCard
            key={movie.id}
            movie={movie}
            onClick={() => onMovieClick(movie)}
          />
        ))}
      </div>

      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="poster-grid__load-more">
          {loading && <div className="poster-grid__spinner" />}
        </div>
      )}
    </>
  );
}
