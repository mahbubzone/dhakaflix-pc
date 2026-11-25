/**
 * PosterCard Component
 *
 * 2:3 artwork with demo-style badges, hover play affordance, progress and a
 * title/meta row. Rating is only shown when the parent supplies real cached
 * metadata.
 */

import React, { memo, useState } from 'react';
import type { Movie } from '../../types';
import { useResolvedPoster } from '../../hooks/useResolvedPoster';
import { useIsWatchlisted, toggleWatchlist } from '../../hooks/useWatchlist';
import { formatRating } from '../../utils/metadata';
import { progressPercent } from '../../utils/format';
import './PosterCard.css';

interface PosterCardProps {
  movie: Movie;
  onClick: () => void;
  progress?: { position: number; duration: number };
  size?: 'small' | 'medium' | 'large';
  isNew?: boolean;
  rank?: number;
  rating?: number | null;
}

function PosterCard({
  movie,
  onClick,
  progress,
  size = 'medium',
  isNew = false,
  rank,
  rating,
}: PosterCardProps) {
  const poster = useResolvedPoster(movie);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const watchlisted = useIsWatchlisted(movie.id);

  const percent = progress ? progressPercent(progress.position, progress.duration) : 0;
  const ratingText = formatRating(rating);

  const handleWatchlistClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    void toggleWatchlist(movie.id, movie);
  };

  const handleWatchlistKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`poster-card poster-card--${size}${watchlisted ? ' poster-card--listed' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${movie.title}${movie.year ? ` (${movie.year})` : ''}`}
    >
      <div className="poster-card__art">
        {!imageError && poster ? (
          <img
            src={poster}
            alt={movie.title}
            className={`poster-card__image ${imageLoaded ? 'loaded' : ''}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="poster-card__placeholder">
            <span className="poster-card__placeholder-icon">🎬</span>
          </div>
        )}

        {rank ? <span className="poster-card__rank">{rank}</span> : null}
        {isNew && <span className="poster-card__new-badge">NEW</span>}
        {movie.quality && <span className="poster-card__badge">{movie.quality}</span>}

        <span className="poster-card__hover-overlay" aria-hidden="true">
          <span className="poster-card__play">▶</span>
        </span>

        <button
          type="button"
          className="poster-card__watchlist"
          onClick={handleWatchlistClick}
          onKeyDown={handleWatchlistKeyDown}
          aria-label={watchlisted ? `Remove ${movie.title} from My List` : `Add ${movie.title} to My List`}
          aria-pressed={watchlisted}
          title={watchlisted ? 'In My List' : 'Add to My List'}
        >
          {watchlisted ? '✓' : '＋'}
        </button>

        {percent > 0 && (
          <div className="poster-card__progress">
            <div
              className="poster-card__progress-fill"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>

      <div className="poster-card__info">
        <div className="poster-card__title" title={movie.title}>{movie.title}</div>
        <div className="poster-card__meta">
          {ratingText && <span className="poster-card__star">★ {ratingText}</span>}
          {movie.year && <span>{movie.year}</span>}
          {movie.quality && <span>{movie.quality}</span>}
          <span>{movie.kind === 1 ? 'Series' : 'Movie'}</span>
        </div>
      </div>
    </div>
  );
}

export default memo(PosterCard);
