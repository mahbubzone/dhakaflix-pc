/**
 * Detail View
 * 
 * Movie/series detail page with play button and metadata.
 */

import React, { useState, useEffect } from 'react';
import { usePlayer } from '../hooks/usePlayer';
import type { Movie, Episode, Progress } from '../types';
import './Detail.css';

interface DetailProps {
  movie: Movie;
  onBack: () => void;
}

export default function Detail({ movie, onBack }: DetailProps) {
  const { play, hasPlayer, openDownloadPage } = usePlayer();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resolvedVideo, setResolvedVideo] = useState<string | null>(movie.video);
  const [resolvedPoster, setResolvedPoster] = useState<string | null>(movie.poster);

  const isSeries = movie.kind === 1;

  useEffect(() => {
    let cancelled = false;

    // Fetch progress
    if (movie.href) {
      window.api.db.getProgress(movie.href).then((value) => {
        if (!cancelled) setProgress(value);
      });
    }

    // Resolve the playable file, poster, and (for series) episodes.
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
    if (!hasPlayer) {
      // Show install prompt
      return;
    }

    setLoading(true);
    const playUrl = url || resolvedVideo || movie.video || movie.href;
    const startPosition = progress && !progress.watched ? progress.position : undefined;

    await play(playUrl, movie.title, startPosition);
    setLoading(false);
  };

  const handleMarkWatched = async () => {
    await window.api.db.markWatched(movie.href);
    setProgress((prev) => prev ? { ...prev, watched: 1 } : null);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m} min`;
  };

  const progressPercent = progress && progress.duration > 0
    ? Math.round((progress.position / progress.duration) * 100)
    : 0;

  const seasons = [...new Set(episodes.map((e) => e.season))].sort((a, b) => a - b);
  const seasonEpisodes = episodes.filter((e) => e.season === selectedSeason);

  return (
    <div className="detail">
      <button className="detail__back" onClick={onBack}>
        ← Back
      </button>

      <div className="detail__content">
        {/* Poster */}
        <div className="detail__poster">
          {resolvedPoster ? (
            <img src={resolvedPoster} alt={movie.title} />
          ) : (
            <div className="detail__poster-placeholder">
              <span>🎬</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="detail__info">
          <h1 className="detail__title">{movie.title}</h1>

          <div className="detail__meta">
            {movie.year && <span>{movie.year}</span>}
            {movie.quality && <span className="detail__badge">{movie.quality}</span>}
            {movie.dual_audio === 1 && <span className="detail__badge">Dual Audio</span>}
            {isSeries && <span className="detail__badge detail__badge--series">Series</span>}
            {movie.category && <span className="detail__category">{movie.category}</span>}
          </div>

          {/* Progress */}
          {progress && progressPercent > 0 && !progress.watched && (
            <div className="detail__progress">
              <div className="detail__progress-bar">
                <div
                  className="detail__progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="detail__progress-text">
                {formatTime(progress.position)} of {formatTime(progress.duration)}
              </span>
            </div>
          )}

          {/* Actions */}
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
                  className="detail__play-btn"
                  onClick={() => handlePlay()}
                  disabled={loading}
                >
                  {loading ? 'Opening...' : progress && progressPercent > 0 && !progress.watched
                    ? `▶ Resume from ${formatTime(progress.position)}`
                    : '▶ Play'}
                </button>

                {!progress?.watched && (
                  <button className="detail__secondary-btn" onClick={handleMarkWatched}>
                    ✓ Mark as Watched
                  </button>
                )}
              </>
            )}
          </div>

          {/* Episode List for Series */}
          {isSeries && episodes.length > 0 && (
            <div className="detail__episodes">
              <div className="detail__season-select">
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

              <div className="detail__episode-list">
                {seasonEpisodes.map((ep) => (
                  <button
                    key={ep.id}
                    className="detail__episode"
                    onClick={() => handlePlay(ep.href)}
                  >
                    <span className="detail__episode-num">E{ep.episode}</span>
                    <span className="detail__episode-title">
                      {ep.title || `Episode ${ep.episode}`}
                    </span>
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
