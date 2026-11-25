/**
 * ContinueCard Component
 *
 * Landscape resume tile for real saved progress. The remaining time comes
 * only from the stored position and duration; no value is fabricated.
 */

import React, { memo, useState } from 'react';
import { useResolvedPoster } from '../../hooks/useResolvedPoster';
import { formatPosition, formatRemaining, progressPercent } from '../../utils/format';
import type { MovieWithProgress } from '../../types';
import './ContinueCard.css';

interface ContinueCardProps {
  movie: MovieWithProgress;
  backdrop?: string | null;
  onClick: () => void;
}

function ContinueCard({ movie, backdrop, onClick }: ContinueCardProps) {
  const poster = useResolvedPoster(movie);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const source = backdrop || poster;
  const imageSrc = imageError && poster && poster !== source ? poster : source;
  const percent = progressPercent(movie.position, movie.duration);
  const remaining = formatRemaining(Math.max(0, movie.duration - movie.position));
  const played = formatPosition(movie.position);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className="continue-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`Resume ${movie.title}, ${remaining} left`}
    >
      <div className="continue-card__art">
        {imageSrc ? (
          <img
            className={`continue-card__image ${imageLoaded ? 'loaded' : ''}`}
            src={imageSrc}
            alt={movie.title}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="continue-card__placeholder">
            <span aria-hidden="true">🎬</span>
          </div>
        )}
        <div className="continue-card__scrim" aria-hidden="true" />
        <span className="continue-card__play" aria-hidden="true">▶</span>
        <div className="continue-card__progress" aria-hidden="true">
          <div className="continue-card__progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="continue-card__info">
        <div className="continue-card__title" title={movie.title}>{movie.title}</div>
        <div className="continue-card__subtitle">Resume · {remaining} left</div>
      </div>
      {played && <span className="continue-card__sr-only">Resuming from {played}</span>}
    </div>
  );
}

export default memo(ContinueCard);
