/**
 * Detail View
 *
 * Cinematic overlay with real metadata, resume controls, watchlist state and
 * episodes. Progress updates arrive as events while this overlay is open.
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import TitleLogo from '../components/media/TitleLogo';
import { usePlayer, type PlayOptions } from '../hooks/usePlayer';
import { useMetadata } from '../hooks/useMetadata';
import { useIsWatchlisted, toggleWatchlist } from '../hooks/useWatchlist';
import {
  formatGenres,
  formatRating,
  formatRuntime,
  isMetadataUsable,
} from '../utils/metadata';
import { formatPosition, progressPercent } from '../utils/format';
import { resumePositionFor } from '../utils/playbackProgress';
import type { Movie, Episode, Progress } from '../types';
import './Detail.css';

interface DetailProps {
  movie: Movie;
  onBack: () => void;
}

export default function Detail({ movie, onBack }: DetailProps) {
  const { players, play, hasPlayer, openDownloadPage } = usePlayer();
  const { metadata } = useMetadata(movie);
  const watchlisted = useIsWatchlisted(movie.id);
  const [progress, setProgress] = useState<Progress | null>(null);
  /** One generation per href, so older reads cannot overwrite newer ones. */
  const progressGeneration = useRef(new Map<string, number>());
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loading, setLoading] = useState(false);
  const [trackingUnavailable, setTrackingUnavailable] = useState(false);
  const [resolvedVideo, setResolvedVideo] = useState<string | null>(movie.video);
  const [resolvedPoster, setResolvedPoster] = useState<string | null>(movie.poster);
  const [backdropFailed, setBackdropFailed] = useState(false);

  const isSeries = movie.kind === 1;
  const vlcInstalled = players.some((player) => player.name === 'vlc' && player.installed);

  const usable = isMetadataUsable(metadata);
  const rating = usable ? formatRating(metadata?.rating) : null;
  const runtime = usable ? formatRuntime(metadata?.runtime) : '';
  const genres = usable ? formatGenres(metadata?.genres) : '';
  const plot = usable ? metadata?.plot?.trim() || '' : '';

  const backdrop = usable && metadata?.backdrop_url ? metadata.backdrop_url : resolvedPoster;
  useEffect(() => setBackdropFailed(false), [backdrop]);

  const backdropSrc = backdropFailed && resolvedPoster && resolvedPoster !== backdrop
    ? resolvedPoster
    : backdrop;

  const readProgress = useCallback(async (href: string): Promise<Progress | null | undefined> => {
    if (!href) return undefined;
    const token = (progressGeneration.current.get(href) ?? 0) + 1;
    progressGeneration.current.set(href, token);
    try {
      const value = await window.api.db.getProgress(href);
      return progressGeneration.current.get(href) === token ? value : undefined;
    } catch {
      return progressGeneration.current.get(href) === token ? null : undefined;
    }
  }, []);

  /** Primary UI always reads the series/movie href, never an episode href. */
  const refreshProgress = useCallback(async () => {
    const value = await readProgress(movie.href);
    if (value !== undefined) setProgress(value);
  }, [movie.href, readProgress]);

  useEffect(() => {
    setProgress(null);
    setTrackingUnavailable(false);
  }, [movie.href]);

  useEffect(() => {
    let cancelled = false;
    void refreshProgress();

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
  }, [movie.id, isSeries, refreshProgress]);

  // Live VLC progress for this title only. No polling and no global remount.
  useEffect(() => {
    const offProgress = window.api.player.onProgress((event) => {
      const matches = event.movieId === movie.id
        || (!!movie.href && event.href === movie.href);
      if (matches) void refreshProgress();
    });
    const offUnavailable = window.api.player.onProgressUnavailable((info) => {
      const matches = info.movieId === movie.id
        || (!!movie.href && info.href === movie.href);
      if (matches) setTrackingUnavailable(true);
    });
    return () => {
      offProgress();
      offUnavailable();
    };
  }, [movie.id, movie.href, refreshProgress]);

  const handlePlay = async (url?: string, fromBeginning = false) => {
    if (!hasPlayer) return;

    setLoading(true);
    const episode = episodes.find((item) => item.href === url);
    const playUrl = url || resolvedVideo || movie.video || movie.href;
    const playHref = episode?.href || movie.href;
    // Read progress for the exact href launched; episode progress never
    // becomes the parent series' resume point.
    const hrefProgress = await readProgress(playHref);
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
    setTrackingUnavailable(!result.tracking);
    setLoading(false);
  };

  const handleOpenInVlc = async () => {
    setLoading(true);
    const playUrl = resolvedVideo || movie.video || movie.href;
    const hrefProgress = await readProgress(movie.href);
    const result = await window.api.player.play(playUrl, {
      title: movie.title,
      startPosition: resumePositionFor(hrefProgress ?? null),
      movieId: movie.id,
      href: movie.href,
      preferredPlayer: 'vlc',
    });
    if (!result.launched && result.error) {
      console.error('Open in VLC failed:', result.error);
    }
    setTrackingUnavailable(!result.tracking);
    setLoading(false);
  };

  const handleMarkWatched = async () => {
    await window.api.db.markWatched(movie.href);
    // Reload so the chip appears even when no progress row existed before.
    await refreshProgress();
  };

  const handleWatchlist = async () => {
    const result = await toggleWatchlist(movie.id, movie);
    if (!result.ok) console.error('Watchlist update failed:', result.error);
  };

  const percent = progress ? progressPercent(progress.position, progress.duration) : 0;
  const canResume = !!progress && percent > 0 && !progress.watched;
  const resumeText = canResume ? formatPosition(progress!.position) : '';

  const seasons = [...new Set(episodes.map((episode) => episode.season))].sort((a, b) => a - b);
  const seasonEpisodes = episodes.filter((episode) => episode.season === selectedSeason);

  return (
    <div
      className="detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${movie.title} details`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onBack();
      }}
    >
      <div className="detail">
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
          <button className="detail__close" onClick={onBack} aria-label="Close details">
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
            {!!progress?.watched && (
              <span className="detail__chip detail__chip--watched">✓ Watched</span>
            )}
          </div>

          {plot && <p className="detail__plot">{plot}</p>}
          {usable && <div className="detail__credit">Details: Cinemeta</div>}

          {canResume && (
            <div className="detail__progress">
              <div className="detail__progress-bar">
                <div className="detail__progress-fill" style={{ width: `${percent}%` }} />
              </div>
              <span className="detail__progress-text">
                {formatPosition(progress!.position)} of {formatPosition(progress!.duration)}
              </span>
            </div>
          )}

          <div className="detail__actions">
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
                  onClick={() => handlePlay()}
                  disabled={loading}
                >
                  {loading ? 'Opening...' : canResume
                    ? `▶ Resume from ${resumeText}`
                    : '▶ Play'}
                </button>

                {canResume && (
                  <button
                    className="detail__btn detail__btn--ghost"
                    onClick={() => handlePlay(undefined, true)}
                    disabled={loading}
                  >
                    Start from beginning
                  </button>
                )}

                {vlcInstalled && (
                  <button
                    className="detail__btn detail__btn--glass"
                    onClick={handleOpenInVlc}
                    disabled={loading}
                  >
                    Open in VLC
                  </button>
                )}

                <button
                  className={`detail__btn detail__btn--ghost${watchlisted ? ' detail__btn--listed' : ''}`}
                  onClick={handleWatchlist}
                  aria-pressed={watchlisted}
                >
                  {watchlisted ? '✓ In My List' : '＋ My List'}
                </button>

                {!progress?.watched && (
                  <button className="detail__btn detail__btn--ghost" onClick={handleMarkWatched}>
                    ✓ Mark watched
                  </button>
                )}
              </>
            )}
          </div>

          {trackingUnavailable && (
            <p className="detail__tracking-note">
              Progress tracking is unavailable for this player.
            </p>
          )}

          {isSeries && episodes.length > 0 && (
            <div className="detail__episodes">
              <h3>Episodes</h3>
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
                    onClick={() => handlePlay(episode.href)}
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
      </div>
    </div>
  );
}
