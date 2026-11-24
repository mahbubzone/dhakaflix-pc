/**
 * PosterGrid Component
 *
 * Responsive catalog grid with lazy loading and an explicit Load more action.
 */

import React, { useRef, useEffect } from 'react';
import PosterCard from './PosterCard';
import type { Metadata, Movie } from '../../types';
import './PosterGrid.css';

interface PosterGridProps {
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  metaById?: ReadonlyMap<number, Metadata>;
  emptyLabel?: string;
}

export default function PosterGrid({
  movies,
  onMovieClick,
  loading = false,
  onLoadMore,
  hasMore = false,
  metaById,
  emptyLabel = 'No titles found',
}: PosterGridProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: '200px' }
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loading]);

  if (loading && movies.length === 0) {
    return (
      <div className="poster-grid">
        {Array.from({ length: 24 }, (_, index) => (
          <div key={index} className="poster-grid__skeleton" />
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="poster-grid__empty">
        <span className="poster-grid__empty-icon">🎬</span>
        <p>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <>
      <div className="poster-grid">
        {movies.map((movie) => (
          <PosterCard
            key={movie.id}
            movie={movie}
            onClick={() => onMovieClick(movie)}
            rating={metaById?.get(movie.id)?.rating ?? null}
          />
        ))}
      </div>

      {hasMore && (
        <div ref={loadMoreRef} className="poster-grid__load-more">
          {loading ? (
            <div className="poster-grid__spinner" />
          ) : (
            <button className="poster-grid__more-btn" onClick={onLoadMore}>
              Load more
            </button>
          )}
        </div>
      )}
    </>
  );
}
