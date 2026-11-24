/**
 * PosterCard Component
 * 
 * Displays a movie/series poster with hover effects.
 */

import React, { useState } from 'react';
import type { Movie } from '../../types';
import { useResolvedPoster } from '../../hooks/useResolvedPoster';
import './PosterCard.css';

interface PosterCardProps {
  movie: Movie;
  onClick: () => void;
  progress?: { position: number; duration: number };
  size?: 'small' | 'medium' | 'large';
  isNew?: boolean;
}

export default function PosterCard({
  movie,
  onClick,
  progress,
  size = 'medium',
  isNew = false,
}: PosterCardProps) {
  const poster = useResolvedPoster(movie);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const progressPercent = progress && progress.duration > 0
    ? Math.min(100, (progress.position / progress.duration) * 100)
    : 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`poster-card poster-card--${size}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${movie.title}${movie.year ? ` (${movie.year})` : ''}`}
    >
      <div className="poster-card__image-container">
        {!imageError && poster ? (
          <img
            src={poster}
            alt={movie.title}
            className={`poster-card__image ${imageLoaded ? 'loaded' : ''}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <div className="poster-card__placeholder">
            <span className="poster-card__placeholder-icon">🎬</span>
          </div>
        )}

        {/* Red NEW badge for recently added titles */}
        {isNew && <span className="poster-card__new-badge">NEW</span>}

        {/* Quality badge */}
        {movie.quality && (
          <span className="poster-card__badge">{movie.quality}</span>
        )}

        {/* Series indicator */}
        {movie.kind === 1 && (
          <span className={`poster-card__series-badge ${isNew ? 'poster-card__series-badge--shifted' : ''}`}>
            SERIES
          </span>
        )}

        {/* Progress bar */}
        {progressPercent > 0 && (
          <div className="poster-card__progress">
            <div
              className="poster-card__progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      <div className="poster-card__info">
        <h3 className="poster-card__title">{movie.title}</h3>
        {movie.year && <span className="poster-card__year">{movie.year}</span>}
      </div>
    </div>
  );
}
