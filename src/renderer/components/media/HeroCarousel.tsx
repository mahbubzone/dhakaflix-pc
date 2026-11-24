/**
 * Rotating featured hero.
 *
 * Each slide is its own child component so the useMetadata hook is called per
 * title. Only titles with real cached/remote metadata join the rotation.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
  isTrending: boolean;
  active: boolean;
  onMetadataState: (id: number, usable: boolean) => void;
  onPlay: () => void;
  onMoreInfo: () => void;
}

function HeroSlide({
  movie,
  isNew,
  isTrending,
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
        <div className="hero__eyebrow">
          {isTrending
            ? 'Trending now'
            : movie.kind === 1 ? 'Featured series' : 'Featured movie'}
        </div>

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
              ★ {rating}
            </span>
          )}
          {movie.year && <span className="hero__chip hero__chip--ghost">{movie.year}</span>}
          {runtime && <span className="hero__chip hero__chip--ghost">{runtime}</span>}
          {movie.quality && <span className="hero__chip">{movie.quality}</span>}
          {movie.dual_audio === 1 && <span className="hero__chip">Dual Audio</span>}
          {genres.length > 0 && (
            <span className="hero__chip hero__chip--ghost">{genres.join(' · ')}</span>
          )}
        </div>

        {plot && <p className="hero__plot">{plot}</p>}

        <div className="hero__actions">
          <button className="hero__btn hero__btn--primary" onClick={onPlay}>
            <span aria-hidden="true">▶</span> Play
          </button>
          <button className="hero__btn hero__btn--glass" onClick={onMoreInfo}>
            More Info
          </button>
        </div>
      </div>
    </div>
  );
}

interface HeroCarouselProps {
  movies: Movie[];
  /** True when the slides come from real trending matches. */
  isTrending?: boolean;
  recentIds?: ReadonlySet<number>;
  onSelect: (movie: Movie) => void;
  onMoreInfo: (movie: Movie) => void;
  paused?: boolean;
}

const ROTATE_MS = 9000;

export default function HeroCarousel({
  movies,
  isTrending = false,
  recentIds,
  onSelect,
  onMoreInfo,
  paused = false,
}: HeroCarouselProps) {
  const [eligibleIds, setEligibleIds] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

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

  useEffect(() => {
    if (paused || hovered || focused || reduceMotion || slideCount < 2) return;
    const timer = window.setInterval(() => setIndex((current) => current + 1), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [paused, hovered, focused, reduceMotion, slideCount]);

  useEffect(() => {
    if (paused || slideCount < 2) return;
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
      setIndex((current) => (current + step + slideCount) % slideCount);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [paused, slideCount]);

  if (!activeMovie) return null;

  const move = (step: number) => setIndex((current) => (current + step + slideCount) % slideCount);

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Featured titles"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      {candidates.map((movie) => (
        <HeroSlide
          key={movie.id}
          movie={movie}
          isNew={recentIds?.has(movie.id) ?? false}
          isTrending={isTrending}
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
              onClick={() => setIndex(dotIndex)}
              aria-label={`Show featured title ${dotIndex + 1}: ${movie.title}`}
              aria-current={dotIndex === safeIndex ? 'true' : undefined}
            />
          ))}
        </div>
        <button className="hero__arrow" onClick={() => move(-1)} aria-label="Previous title">
          ‹
        </button>
        <button className="hero__arrow" onClick={() => move(1)} aria-label="Next title">
          ›
        </button>
      </div>
    </section>
  );
}
