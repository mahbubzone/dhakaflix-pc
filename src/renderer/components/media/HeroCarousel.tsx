/**
 * Rotating featured hero.
 *
 * Each slide is its own child component so the useMetadata hook is called per
 * title. Only titles with real cached/remote metadata join the rotation.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../common/Icon';
import TitleLogo from './TitleLogo';
import { useMetadata } from '../../hooks/useMetadata';
import { useResolvedPoster } from '../../hooks/useResolvedPoster';
import {
  formatGenres,
  formatRating,
  formatRuntime,
  isMetadataUsable,
  parseGenres,
} from '../../utils/metadata';
import type { Movie } from '../../types';
import './HeroCarousel.css';

interface HeroSlideProps {
  movie: Movie;
  isNew: boolean;
  active: boolean;
  onMetadataState: (id: number, usable: boolean) => void;
  onPlay: () => void;
  onMoreInfo: () => void;
}

function HeroSlide({
  movie,
  isNew,
  active,
  onMetadataState,
  onPlay,
  onMoreInfo,
}: HeroSlideProps) {
  const { metadata } = useMetadata(movie);
  const poster = useResolvedPoster(movie);
  const [backdropFailed, setBackdropFailed] = useState(false);

  const usable = isMetadataUsable(metadata);
  const metadataBackdrop = usable ? metadata.backdrop_url : null;
  const backdrop = metadataBackdrop || poster;
  useEffect(() => setBackdropFailed(false), [backdrop]);

  useEffect(() => {
    onMetadataState(movie.id, usable);
  }, [movie.id, usable, onMetadataState]);

  useEffect(() => () => onMetadataState(movie.id, false), [movie.id, onMetadataState]);

  const backdropSrc = backdropFailed && poster && poster !== backdrop ? poster : backdrop;
  const rating = usable ? formatRating(metadata?.rating) : null;
  const runtime = usable ? formatRuntime(metadata?.runtime) : '';
  const genres = usable ? parseGenres(metadata?.genres).slice(0, 3) : [];
  const plot = usable ? metadata?.plot?.trim() || '' : '';

  return (
    <div className="hero__slide" hidden={!active} aria-hidden={!active}>
      {backdropSrc && (
        <img
          className="hero__bg"
          src={backdropSrc}
          alt=""
          aria-hidden="true"
          onError={() => setBackdropFailed(true)}
        />
      )}
      <div className="hero__scrim" />

      <div className="hero__copy">
        <button className="hero__title-button" onClick={onMoreInfo} aria-label={`Open ${movie.title}`}>
          <TitleLogo
            title={movie.title}
            logoUrl={usable ? metadata?.logo_url : null}
            size="hero"
          />
        </button>

        <div className="hero__meta">
          {isNew && <span className="hero__chip hero__chip--new">NEW</span>}
          {rating && (
            <span className="hero__chip hero__chip--imdb" aria-label={`IMDb ${rating}`}>
              <Icon name="star" style={{ fontSize: 'var(--icon-inline)' }} />
              {rating}
            </span>
          )}
          {movie.year && <span className="hero__chip hero__chip--ghost badge">{movie.year}</span>}
          {runtime && <span className="hero__chip hero__chip--ghost badge">{runtime}</span>}
          {movie.quality && <span className="hero__chip badge">{movie.quality}</span>}
          {movie.dual_audio === 1 && <span className="hero__chip badge">Dual Audio</span>}
          {genres.length > 0 && (
            <span className="hero__chip hero__chip--ghost badge">{genres.join(' · ')}</span>
          )}
        </div>

        {plot && <p className="hero__plot">{plot}</p>}

        <div className="hero__actions">
          <button className="btn btn--primary hero__btn hero__btn--primary" onClick={onPlay}>
            <Icon name="play" style={{ fontSize: 'var(--icon-button)' }} /> Play
          </button>
          <button className="btn btn--secondary hero__btn hero__btn--glass" onClick={onMoreInfo}>
            <Icon name="info" style={{ fontSize: 'var(--icon-button)' }} /> More Info
          </button>
        </div>
      </div>
    </div>
  );
}

interface HeroCarouselProps {
  movies: Movie[];
  recentIds?: ReadonlySet<number>;
  onSelect: (movie: Movie) => void;
  onMoreInfo: (movie: Movie) => void;
  paused?: boolean;
}

const ROTATE_MS = 9000;

export default function HeroCarousel({
  movies,
  recentIds,
  onSelect,
  onMoreInfo,
  paused = false,
}: HeroCarouselProps) {
  const [eligibleIds, setEligibleIds] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  /** Remaining time survives hover/focus pauses; manual moves reset it. */
  const remainingRef = useRef(ROTATE_MS);
  const firedRef = useRef(false);

  const onMetadataState = useCallback((id: number, usable: boolean) => {
    setEligibleIds((prev) => {
      if (usable) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      const next = prev.filter((value) => value !== id);
      return next.length === prev.length ? prev : next;
    });
  }, []);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  const candidates = movies.slice(0, 8);
  const withMetadata = candidates.filter((movie) => eligibleIds.includes(movie.id)).slice(0, 5);
  const slides = withMetadata.length > 0 ? withMetadata : candidates.slice(0, 1);
  const slideCount = slides.length;
  const safeIndex = slideCount > 0 ? index % slideCount : 0;
  const activeMovie = slides[safeIndex];

  const isPaused = paused || reduceMotion;

  useEffect(() => {
    if (isPaused || slideCount < 2) return;
    firedRef.current = false;
    const deadline = Date.now() + remainingRef.current;
    const timer = window.setTimeout(() => {
      firedRef.current = true;
      remainingRef.current = ROTATE_MS;
      setIndex((current) => current + 1);
    }, remainingRef.current);
    return () => {
      window.clearTimeout(timer);
      // Hover/focus keeps the leftover time; a completed or manual move restarts.
      remainingRef.current = firedRef.current
        ? ROTATE_MS
        : Math.max(0, deadline - Date.now());
    };
  }, [isPaused, slideCount, index]);

  useEffect(() => {
    if (isPaused || slideCount < 2) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const target = event.target as HTMLElement | null;
      if (
        target
        && (target.tagName === 'INPUT'
          || target.tagName === 'TEXTAREA'
          || target.tagName === 'SELECT'
          || target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      firedRef.current = true;
      setIndex((current) => (current + step + slideCount) % slideCount);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPaused, slideCount]);

  if (!activeMovie) return null;

  const move = (step: number) => {
    firedRef.current = true;
    setIndex((current) => (current + step + slideCount) % slideCount);
  };

  return (
    <section
      className={`hero${isPaused ? ' hero--paused' : ''}`}
      aria-roledescription="carousel"
      aria-label="Featured titles"
    >
      {candidates.map((movie) => (
        <HeroSlide
          key={movie.id}
          movie={movie}
          isNew={recentIds?.has(movie.id) ?? false}
          active={movie.id === activeMovie.id}
          onMetadataState={onMetadataState}
          onPlay={() => onSelect(movie)}
          onMoreInfo={() => onMoreInfo(movie)}
        />
      ))}

      <div className="hero__nav">
        <div className="hero__dots" role="group" aria-label="Choose featured title">
          {slides.map((movie, dotIndex) => (
            <button
              key={movie.id}
              className={`hero__dot ${dotIndex === safeIndex ? 'on' : ''}`}
              onClick={() => {
                if (dotIndex === safeIndex) return;
                firedRef.current = true;
                setIndex(dotIndex);
              }}
              aria-label={`Show featured title ${dotIndex + 1}: ${movie.title}`}
              aria-current={dotIndex === safeIndex ? 'true' : undefined}
            >
              {dotIndex === safeIndex && (
                <span key={`${safeIndex}-${index}`} className="hero__dot-fill" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
        <button className="hero__arrow" onClick={() => move(-1)} aria-label="Previous title">
          <Icon name="arrow-left" style={{ fontSize: 'var(--icon-button)' }} />
        </button>
        <button className="hero__arrow" onClick={() => move(1)} aria-label="Next title">
          <Icon name="arrow-right" style={{ fontSize: 'var(--icon-button)' }} />
        </button>
      </div>
    </section>
  );
}
