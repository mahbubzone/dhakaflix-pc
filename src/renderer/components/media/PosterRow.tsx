/**
 * PosterRow Component
 * 
 * Horizontal scrolling row of poster cards.
 */

import React, { useRef, useState, useEffect } from 'react';
import PosterCard from './PosterCard';
import type { Movie } from '../../types';
import './PosterRow.css';

interface PosterRowProps {
  title: string;
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  onSeeAll?: () => void;
  loading?: boolean;
}

export default function PosterRow({
  title,
  movies,
  onMovieClick,
  onSeeAll,
  loading = false,
}: PosterRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkArrows = () => {
    const el = scrollRef.current;
    if (!el) return;

    setShowLeftArrow(el.scrollLeft > 0);
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkArrows();
    window.addEventListener('resize', checkArrows);
    return () => window.removeEventListener('resize', checkArrows);
  }, [movies]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return (
      <div className="poster-row">
        <div className="poster-row__header">
          <h2 className="poster-row__title">{title}</h2>
        </div>
        <div className="poster-row__loading">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="poster-row__skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return null;
  }

  return (
    <div className="poster-row">
      <div className="poster-row__header">
        <h2 className="poster-row__title">{title}</h2>
        {onSeeAll && (
          <button className="poster-row__see-all" onClick={onSeeAll}>
            See All →
          </button>
        )}
      </div>

      <div className="poster-row__container">
        {showLeftArrow && (
          <button
            className="poster-row__arrow poster-row__arrow--left"
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            ‹
          </button>
        )}

        <div
          ref={scrollRef}
          className="poster-row__scroll"
          onScroll={checkArrows}
        >
          {movies.map((movie) => (
            <PosterCard
              key={movie.id}
              movie={movie}
              onClick={() => onMovieClick(movie)}
            />
          ))}
        </div>

        {showRightArrow && (
          <button
            className="poster-row__arrow poster-row__arrow--right"
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
