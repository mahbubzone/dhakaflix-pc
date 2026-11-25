/**
 * Centered detail modal.
 *
 * Hero and action bar stay fixed; only the body scrolls. Metadata, watched,
 * favorite and watchlist state all come from real backend results.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import TitleLogo from './TitleLogo';
import TrailerEmbed, { firstTrailerId } from './TrailerEmbed';
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
  const { metadata } = useMetadata(movie);
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
  const [playRequest, setPlayRequest] = useState(0);
  const toastTimer = useRef<number | undefined>(undefined);

  const isSeries = movie.kind === 1;
  const usable = isMetadataUsable(metadata);
  const rating = usable ? formatRating(metadata?.rating) : null;
  const runtime = usable ? formatRuntime(metadata?.runtime) : '';
  const genres = usable ? formatGenres(metadata?.genres) : '';
  const plot = usable ? metadata?.plot?.trim() || '' : '';
  const cast = usable ? parseNameList(metadata?.cast) : [];
  const director = usable ? parseNameList(metadata?.director) : [];
  const awards = usable ? metadata?.awards?.trim() || '' : '';
  const hasTrailer = !!(usable && firstTrailerId(metadata?.trailers));

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
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

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
    setPlayRequest((value) => value + 1);
    document.getElementById('detail-trailer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

        <div className="detail__body">
          <div className="detail__meta">
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

          <div id="detail-trailer">
            <TrailerEmbed trailers={usable ? metadata?.trailers : null} title={movie.title} playRequest={playRequest} />
          </div>

          {progress && (
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
                  <span aria-hidden="true">{watchlisted ? '🔖' : '＋'}</span>
                </button>
                <button
                  className={`detail__icon${favorite ? ' detail__icon--on detail__icon--favorite' : ''}`}
                  onClick={() => void handleToggleFavorite()}
                  aria-pressed={favorite}
                  aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
                  title={favorite ? 'Favorite' : 'Add to favorites'}
                >
                  <span aria-hidden="true">{favorite ? '♥' : '♡'}</span>
                </button>
                <button
                  className={`detail__icon${watched ? ' detail__icon--on detail__icon--watched' : ''}`}
                  onClick={() => void handleToggleWatched()}
                  aria-pressed={watched}
                  aria-label={watched ? 'Marked as Watched' : 'Mark as Watched'}
                  title={watched ? 'Marked as Watched' : 'Mark as Watched'}
                >
                  <span aria-hidden="true">✓</span>
                </button>
                {hasTrailer && (
                  <button
                    className="detail__icon detail__icon--trailer"
                    onClick={handleTrailer}
                    aria-label="Play trailer"
                    title="Play trailer"
                  >
                    <span aria-hidden="true">▶</span>
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
    </div>
  );
}
