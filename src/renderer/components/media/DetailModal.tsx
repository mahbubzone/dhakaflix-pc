/**
 * Centered detail modal.
 *
 * Hero and action bar stay fixed; only the body scrolls. Metadata, watched,
 * favorite and watchlist state all come from real backend results.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import TitleLogo from './TitleLogo';
import TrailerModal from './TrailerModal';
import { firstTrailerId } from './TrailerEmbed';
import { usePlayer, type PlayOptions } from '../../hooks/usePlayer';
import { useMetadata } from '../../hooks/useMetadata';
import { useWatched } from '../../hooks/useWatched';
import { useFavorite, useIsFavorite } from '../../hooks/useFavorite';
import { useIsWatchlisted, toggleWatchlist } from '../../hooks/useWatchlist';
import {
  formatGenres,
  formatRating,
  formatRuntime,
  isMetadataUsable,
  parseGenres as parseNameList,
} from '../../utils/metadata';
import { formatPosition, progressPercent } from '../../utils/format';
import { resumePositionFor } from '../../utils/playbackProgress';
import type { Episode, Movie } from '../../types';
import './DetailModal.css';

interface DetailModalProps {
  movie: Movie;
  onClose: () => void;
}

export default function DetailModal({ movie, onClose }: DetailModalProps) {
  const { players, play, hasPlayer, openDownloadPage } = usePlayer();
  const { metadata, loading: metadataLoading } = useMetadata(movie);
  const { progress, watched, trackingUnavailable, toggle: toggleWatched } = useWatched(movie.href, movie.id);
  const favorite = useIsFavorite(movie.id);
  const { toggle: toggleFavorite } = useFavorite();
  const watchlisted = useIsWatchlisted(movie.id);

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resolvedVideo, setResolvedVideo] = useState<string | null>(movie.video);
  const [resolvedPoster, setResolvedPoster] = useState<string | null>(movie.poster);
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  const isSeries = movie.kind === 1;
  const usable = isMetadataUsable(metadata);
  const showMetadataSkeleton = metadataLoading && !usable;
  const rating = usable ? formatRating(metadata?.rating) : null;
  const runtime = usable ? formatRuntime(metadata?.runtime) : '';
  const genres = usable ? formatGenres(metadata?.genres) : '';
  const plot = usable ? metadata?.plot?.trim() || '' : '';
  const cast = usable ? parseNameList(metadata?.cast) : [];
  const director = usable ? parseNameList(metadata?.director) : [];
  const awards = usable ? metadata?.awards?.trim() || '' : '';
  const trailerId = usable ? firstTrailerId(metadata?.trailers) : null;
  const hasTrailer = !!trailerId;

  const backdrop = usable && metadata?.backdrop_url ? metadata.backdrop_url : resolvedPoster;
  useEffect(() => setBackdropFailed(false), [backdrop]);
  const backdropSrc = backdropFailed && resolvedPoster && resolvedPoster !== backdrop
    ? resolvedPoster
    : backdrop;

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !trailerOpen) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, trailerOpen]);

  useEffect(() => {
    let cancelled = false;
    window.api.media
      .resolve(movie.id)
      .then((assets) => {
        if (cancelled) return;
        setResolvedVideo(assets.video);
        setResolvedPoster(assets.poster);
        if (isSeries && assets.episodes > 0) {
          window.api.db.getEpisodes(movie.id).then((eps) => {
            if (cancelled) return;
            setEpisodes(eps);
            if (eps.length > 0) setSelectedSeason(eps[0].season);
          });
        }
      })
      .catch(() => {
        // Resolution is best effort; the folder URL still opens in a player.
      });
    return () => {
      cancelled = true;
    };
  }, [movie.id, isSeries]);

  const handlePlay = async (url?: string, fromBeginning = false) => {
    if (!hasPlayer) return;
    setLoading(true);
    const episode = episodes.find((item) => item.href === url);
    const playUrl = url || resolvedVideo || movie.video || movie.href;
    const playHref = episode?.href || movie.href;
    let hrefProgress = progress;
    if (playHref === movie.href) {
      hrefProgress = progress;
    } else {
      try {
        hrefProgress = await window.api.db.getProgress(playHref);
      } catch {
        hrefProgress = null;
      }
    }
    const options: PlayOptions = {
      title: episode
        ? `${movie.title} — S${episode.season} E${episode.episode}`
        : movie.title,
      startPosition: resumePositionFor(hrefProgress ?? null, fromBeginning),
      movieId: movie.id,
      href: playHref,
      episodeId: episode?.id,
    };
    const result = await play(playUrl, options);
    if (!result.launched && result.error) console.error('Play failed:', result.error);
    setLoading(false);
  };

  const handleToggleWatched = async () => {
    const result = await toggleWatched();
    if (!result.ok) {
      showToast(result.error || 'Could not update watched state');
      return;
    }
    showToast(result.watched === 1 ? 'Marked as watched' : 'Marked as unwatched');
  };

  const handleToggleFavorite = async () => {
    const result = await toggleFavorite(movie.id);
    if (!result.ok) {
      showToast(result.error || 'Could not update favorites');
      return;
    }
    showToast(result.favorite ? 'Added to favorites' : 'Removed from favorites');
  };

  const handleToggleWatchlist = async () => {
    const result = await toggleWatchlist(movie.id, movie);
    if (!result.ok) {
      showToast(result.error || 'Could not update Watchlist');
      return;
    }
    showToast(result.watchlisted ? 'Added to Watchlist' : 'Removed from Watchlist');
  };

  const handleTrailer = () => {
    setTrailerOpen(true);
  };

  const percent = progress ? progressPercent(progress.position, progress.duration) : 0;
  const canResume = !!progress && progress.position > 0 && !watched;
  const resumeText = canResume ? formatPosition(progress!.position) : '';
  // A watched-only row can have no real timing. Never show an empty time range.
  const progressLabel = progress && progress.duration > 0 && progress.position > 0
    ? `${formatPosition(progress.position)} of ${formatPosition(progress.duration)}`
    : watched ? 'Watched' : 'Not started';

  const seasons = [...new Set(episodes.map((episode) => episode.season))].sort((a, b) => a - b);
  const seasonEpisodes = episodes.filter((episode) => episode.season === selectedSeason);

  return (
    <div
      className="detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${movie.title} details`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="detail">
        <div className="detail__grain" aria-hidden="true" />

        <div className="detail__hero">
          {backdropSrc && (
            <img
              className="detail__bg"
              src={backdropSrc}
              alt=""
              aria-hidden="true"
              decoding="async"
              onError={() => setBackdropFailed(true)}
            />
          )}
          <div className="detail__hero-scrim" />
          <button className="detail__close" onClick={onClose} aria-label="Close details">
            ×
          </button>
          <div className="detail__copy">
            <TitleLogo title={movie.title} logoUrl={usable ? metadata?.logo_url : null} size="detail" />
          </div>
        </div>

        <div className="detail__body" aria-busy={showMetadataSkeleton}>
          <div className="detail__meta">
            {showMetadataSkeleton && (
              <>
                <span className="detail__skeleton detail__skeleton--chip" aria-hidden="true" />
                <span className="detail__skeleton detail__skeleton--chip detail__skeleton--chip-sm" aria-hidden="true" />
                <span className="detail__skeleton detail__skeleton--chip detail__skeleton--chip-sm" aria-hidden="true" />
              </>
            )}
            {rating && (
              <span className="detail__chip detail__chip--imdb" aria-label={`IMDb ${rating}`}>
                ★ {rating}
              </span>
            )}
            {movie.year && <span className="detail__chip detail__chip--ghost">{movie.year}</span>}
            {runtime && <span className="detail__chip detail__chip--ghost">{runtime}</span>}
            {movie.quality && <span className="detail__chip">{movie.quality}</span>}
            {movie.dual_audio === 1 && <span className="detail__chip">Dual Audio</span>}
            {isSeries && <span className="detail__chip detail__chip--series">Series</span>}
            {movie.category && <span className="detail__chip detail__chip--ghost">{movie.category}</span>}
            {genres && <span className="detail__chip detail__chip--ghost">{genres}</span>}
            {watched && <span className="detail__chip detail__chip--watched">✓ Watched</span>}
          </div>

          {showMetadataSkeleton && (
            <div className="detail__skeleton-block" aria-hidden="true">
              <span className="detail__skeleton detail__skeleton--plot" />
              <span className="detail__skeleton detail__skeleton--plot detail__skeleton--plot-short" />
              <div className="detail__skeleton-fact">
                <span className="detail__skeleton detail__skeleton--label" />
                <span className="detail__skeleton detail__skeleton--value" />
              </div>
              <div className="detail__skeleton-fact">
                <span className="detail__skeleton detail__skeleton--label" />
                <span className="detail__skeleton detail__skeleton--value detail__skeleton--value-short" />
              </div>
            </div>
          )}

          {plot && <p className="detail__plot">{plot}</p>}

          {cast.length > 0 && (
            <div className="detail__fact">
              <span className="detail__fact-label">Cast</span>
              <span className="detail__fact-value">{cast.join(', ')}</span>
            </div>
          )}
          {director.length > 0 && (
            <div className="detail__fact">
              <span className="detail__fact-label">Director</span>
              <span className="detail__fact-value">{director.join(', ')}</span>
            </div>
          )}
          {awards && (
            <div className="detail__fact">
              <span className="detail__fact-label">Awards</span>
              <span className="detail__fact-value">{awards}</span>
            </div>
          )}

          {progress && progress.duration > 0 && progress.position > 0 && (
            <div className="detail__progress">
              <div className="detail__progress-bar">
                <div className="detail__progress-fill" style={{ width: `${percent}%` }} />
              </div>
              <span className="detail__progress-text">{progressLabel}</span>
            </div>
          )}

          {isSeries && episodes.length > 0 && (
            <div className="detail__episodes">
              <h3 className="detail__section-title">Episodes</h3>
              <div className="detail__season-select" role="group" aria-label="Seasons">
                {seasons.map((season) => (
                  <button
                    key={season}
                    className={`detail__season-btn ${selectedSeason === season ? 'active' : ''}`}
                    onClick={() => setSelectedSeason(season)}
                  >
                    Season {season}
                  </button>
                ))}
              </div>

              <div className="detail__episode-grid">
                {seasonEpisodes.map((episode) => (
                  <button
                    key={episode.id}
                    className="detail__episode"
                    onClick={() => void handlePlay(episode.href)}
                    aria-label={`Play season ${episode.season} episode ${episode.episode}`}
                  >
                    <b>S{episode.season} E{episode.episode}</b>
                    <span>{episode.title || `Episode ${episode.episode}`}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="detail__actionbar">
          {!hasPlayer ? (
            <div className="detail__no-player">
              <p>No video player found. Please install:</p>
              <button onClick={() => openDownloadPage('vlc')}>Download VLC</button>
              <button onClick={() => openDownloadPage('potplayer')}>Download PotPlayer</button>
            </div>
          ) : (
            <>
              <button
                className="detail__btn detail__btn--primary"
                onClick={() => void handlePlay()}
                disabled={loading}
              >
                {loading ? 'Opening...' : canResume
                  ? `▶ Resume from ${resumeText}`
                  : '▶ Play'}
              </button>

              {canResume && (
                <button
                  className="detail__btn detail__btn--ghost"
                  onClick={() => void handlePlay(undefined, true)}
                  disabled={loading}
                >
                  Start from beginning
                </button>
              )}

              <div className="detail__icon-actions">
                <button
                  className={`detail__icon${watchlisted ? ' detail__icon--on detail__icon--watchlist' : ''}`}
                  onClick={() => void handleToggleWatchlist()}
                  aria-pressed={watchlisted}
                  aria-label={watchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  title={watchlisted ? 'In Watchlist' : 'Add to Watchlist'}
                >
                  <svg className="detail__icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      className="detail__icon-fill"
                      d="M6.5 4.5h11v15.4L12 16.2l-5.5 3.7z"
                    />
                  </svg>
                </button>
                <button
                  className={`detail__icon${favorite ? ' detail__icon--on detail__icon--favorite' : ''}`}
                  onClick={() => void handleToggleFavorite()}
                  aria-pressed={favorite}
                  aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
                  title={favorite ? 'Favorite' : 'Add to favorites'}
                >
                  <svg className="detail__icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      className="detail__icon-fill"
                      d="M12 20.1 5.2 13.3a4.5 4.5 0 0 1 6.4-6.3l.4.4.4-.4a4.5 4.5 0 0 1 6.4 6.3z"
                    />
                  </svg>
                </button>
                <button
                  className={`detail__icon${watched ? ' detail__icon--on detail__icon--watched' : ''}`}
                  onClick={() => void handleToggleWatched()}
                  aria-pressed={watched}
                  aria-label={watched ? 'Marked as Watched' : 'Mark as Watched'}
                  title={watched ? 'Marked as Watched' : 'Mark as Watched'}
                >
                  <svg className="detail__icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.2 11.2V12a8.2 8.2 0 1 1-4.9-7.5" />
                    <path d="m8.4 12.2 2.7 2.7 5.6-5.8" />
                  </svg>
                </button>
                {hasTrailer && (
                  <button
                    className="detail__icon detail__icon--trailer"
                    onClick={handleTrailer}
                    aria-label="Watch trailer"
                    title="Watch trailer"
                  >
                    <svg className="detail__icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                      <path className="detail__icon-fill" d="M9 6.2v11.6L18.4 12z" />
                    </svg>
                  </button>
                )}
              </div>

              {trackingUnavailable && (
                <p className="detail__tracking-note">Progress tracking is unavailable for this player.</p>
              )}
            </>
          )}
        </div>

        {toast && <div className="detail__toast" role="status" aria-live="polite">{toast}</div>}
      </div>

      {trailerOpen && trailerId && (
        <TrailerModal
          youtubeId={trailerId}
          title={movie.title}
          onClose={() => setTrailerOpen(false)}
        />
      )}
    </div>
  );
}
