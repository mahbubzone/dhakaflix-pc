/**
 * Detail View
 *
 * Cinematic overlay with real metadata, playback actions and episodes.
 */

import React, { useState, useEffect } from 'react';
import TitleLogo from '../components/media/TitleLogo';
import { usePlayer } from '../hooks/usePlayer';
import { useMetadata } from '../hooks/useMetadata';
import { formatGenres, formatRating, formatRuntime, isMetadataUsable } from '../utils/metadata';
import type { Movie, Episode, Progress } from '../types';
import './Detail.css';

interface DetailProps {
  movie: Movie;
  onBack: () => void;
}

export default function Detail({ movie, onBack }: DetailProps) {
  const { players, play, hasPlayer, openDownloadPage } = usePlayer();
  const { metadata } = useMetadata(movie);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    if (movie.href) {
      window.api.db.getProgress(movie.href)
        .then((value) => {
          if (!cancelled) setProgress(value);
        })
        .catch(() => {
          if (!cancelled) setProgress(null);
        });
    }

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
  }, [movie.id, movie.href, isSeries]);

  const handlePlay = async (url?: string) => {
    if (!hasPlayer) return;

    setLoading(true);
    const playUrl = url || resolvedVideo || movie.video || movie.href;
    const startPosition = progress && !progress.watched ? progress.position : undefined;

    await play(playUrl, movie.title, startPosition);
    setLoading(false);
  };

  const handleOpenInVlc = async () => {
    setLoading(true);
    const playUrl = resolvedVideo || movie.video || movie.href;
    const startPosition = progress && !progress.watched ? progress.position : undefined;
    const result = await window.api.player.play(playUrl, {
      title: movie.title,
      startPosition,
      preferredPlayer: 'vlc',
    });
    if (!result.launched && result.error) {
      console.error('Open in VLC failed:', result.error);
    }
    setLoading(false);
  };

  const handleMarkWatched = async () => {
    await window.api.db.markWatched(movie.href);
    setProgress((previous) => previous ? { ...previous, watched: 1 } : null);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
  };

  const progressPercent = progress && progress.duration > 0
    ? Math.round((progress.position / progress.duration) * 100)
    : 0;

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
          </div>

          {plot && <p className="detail__plot">{plot}</p>}
          {usable && <div className="detail__credit">Details: Cinemeta</div>}

          {progress && progressPercent > 0 && !progress.watched && (
            <div className="detail__progress">
              <div className="detail__progress-bar">
                <div className="detail__progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="detail__progress-text">
                {formatTime(progress.position)} of {formatTime(progress.duration)}
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
                  {loading ? 'Opening...' : progress && progressPercent > 0 && !progress.watched
                    ? `▶ Resume from ${formatTime(progress.position)}`
                    : '▶ Play'}
                </button>

                {vlcInstalled && (
                  <button
                    className="detail__btn detail__btn--glass"
                    onClick={handleOpenInVlc}
                    disabled={loading}
                  >
                    Open in VLC
                  </button>
                )}

                {!progress?.watched && (
                  <button className="detail__btn detail__btn--ghost" onClick={handleMarkWatched}>
                    ✓ Mark watched
                  </button>
                )}
              </>
            )}
          </div>

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
