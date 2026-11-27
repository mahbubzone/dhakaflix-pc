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
  onRemove?: () => void | Promise<void>;
}

function ContinueCard({ movie, backdrop, onClick, onRemove }: ContinueCardProps) {
  const poster = useResolvedPoster(movie);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  const source = backdrop || poster;
  const imageSrc = imageError && poster && poster !== source ? poster : source;
  const percent = progressPercent(movie.position, movie.duration);
  const remaining = formatRemaining(Math.max(0, movie.duration - movie.position));
  const played = formatPosition(movie.position);

  const handleRemoveClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!onRemove || removing) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setRemoving(true);
    Promise.resolve(onRemove()).finally(() => {
      setRemoving(false);
      setConfirming(false);
    });
  };

  const handleRemoveKeyDown = (event: React.KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Escape') setConfirming(false);
  };

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
      onMouseLeave={() => setConfirming(false)}
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
        {onRemove && (
          <button
            type="button"
            className={`continue-card__remove${confirming ? ' continue-card__remove--confirm' : ''}`}
            onClick={handleRemoveClick}
            onKeyDown={handleRemoveKeyDown}
            disabled={removing}
            aria-label={confirming
              ? `Confirm removing ${movie.title} from Continue Watching`
              : `Remove ${movie.title} from Continue Watching`}
            title={confirming ? 'Click again to delete saved progress' : 'Remove from Continue Watching'}
          >
            {confirming ? 'Remove?' : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            )}
          </button>
        )}
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
