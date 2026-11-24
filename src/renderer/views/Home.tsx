/**
 * Home View
 *
 * Screenshot-matched landing page: icon rail shell, real category tabs,
 * poster backdrop hero, Continue watching / Just added / category rows.
 */

import React, { useState, useEffect, useCallback } from 'react';
import PosterRow from '../components/media/PosterRow';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useResolvedPoster } from '../hooks/useResolvedPoster';
import { buildHomeTabs, getFeaturedCategoryOrder, type HomeTab } from '../utils/homeTabs';
import type { CategoryCount, Movie } from '../types';
import './Home.css';

interface HomeProps {
  onMovieSelect: (movie: Movie) => void;
  onCategorySelect: (category: string) => void;
  onNavigate: (view: 'home' | 'movies' | 'series') => void;
  categories: CategoryCount[];
}

/** Optional metadata fields. Only rendered when the IPC row actually has them. */
type RichMovie = Movie & {
  rating?: number;
  runtime?: number;
  genres?: string | string[];
  plot?: string;
};

function formatRuntime(minutes: number): string {
  const total = Math.max(1, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  if (hours === 0) return `${remainder}m`;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function formatGenres(value: string | string[] | undefined): string {
  if (Array.isArray(value) && value.length > 0) return value.join(', ');
  if (typeof value === 'string') return value.trim();
  return '';
}

interface HeroProps {
  movie: Movie;
  isNew: boolean;
  onSelect: () => void;
}

function Hero({ movie, isNew, onSelect }: HeroProps) {
  const poster = useResolvedPoster(movie);
  const rich = movie as RichMovie;

  const rating = typeof rich.rating === 'number' ? rich.rating.toFixed(1) : null;
  const runtime = typeof rich.runtime === 'number' ? formatRuntime(rich.runtime) : null;
  const genres = formatGenres(rich.genres);
  const description = rich.plot?.trim() || '';

  return (
    <section className="hero">
      {poster && (
        <img className="hero__backdrop" src={poster} alt="" aria-hidden="true" />
      )}
      <div className="hero__shade" />

      <div className="hero__copy">
        <button className="hero__title-button" onClick={onSelect} aria-label={`Open ${movie.title}`}>
          <h1 className="hero__title">{movie.title}</h1>
        </button>

        <div className="hero__meta">
          {isNew && <span className="hero__tag-new">NEW</span>}
          {rating && (
            <span className="hero__imdb" aria-label={`IMDb ${rating}`}>
              <span className="hero__imdb-label">IMDb</span> {rating}
            </span>
          )}
          {movie.year && <span className="hero__plain">{movie.year}</span>}
          {runtime && <span className="hero__plain">{runtime}</span>}
          {movie.quality && <span className="hero__pill">{movie.quality}</span>}
          {movie.dual_audio === 1 && <span className="hero__pill">Dual Audio</span>}
          {genres && <span className="hero__plain">{genres}</span>}
        </div>

        {description && <p className="hero__description">{description}</p>}
      </div>
    </section>
  );
}

export default function Home({
  onMovieSelect,
  onCategorySelect,
  onNavigate,
  categories,
}: HomeProps) {
  const [continueWatching, setContinueWatching] = useState<Movie[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Movie[]>([]);
  const [categoryRows, setCategoryRows] = useState<{ category: string; movies: Movie[] }[]>([]);
  const [loading, setLoading] = useState(true);

  const tabs = buildHomeTabs(categories);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [watching, recent] = await Promise.all([
        window.api.db.getContinueWatching(20),
        window.api.db.getMovies({ limit: 15, offset: 0, sortBy: 'added', sortOrder: 'desc' }),
      ]);

      setContinueWatching(watching);
      setRecentlyAdded(recent.movies);

      const topCategories = getFeaturedCategoryOrder(categories).slice(0, 5);
      const categoryData = await Promise.all(
        topCategories.map(async (category) => {
          const result = await window.api.db.getMovies({
            category,
            limit: 12,
            offset: 0,
            sortBy: 'added',
            sortOrder: 'desc',
          });
          return { category, movies: result.movies };
        })
      );

      setCategoryRows(categoryData.filter((row) => row.movies.length > 0));
    } catch (error) {
      console.error('Failed to fetch home data:', error);
    } finally {
      setLoading(false);
    }
  }, [categories]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabClick = (tab: HomeTab) => {
    if (tab.kind === 'view') {
      onNavigate(tab.id);
    } else {
      onCategorySelect(tab.id);
    }
  };

  if (loading) {
    return (
      <div className="home home--loading">
        <LoadingSpinner size="large" label="Loading..." />
      </div>
    );
  }

  const hasContent = recentlyAdded.length > 0 || continueWatching.length > 0;

  if (!hasContent) {
    return (
      <div className="home home--empty">
        <div className="home__empty-state">
          <span className="home__empty-icon">📺</span>
          <h2>Welcome to DhakaFlix</h2>
          <p>No movies in your library yet.</p>
          <p>Go to Settings to scan your ISP media servers.</p>
        </div>
      </div>
    );
  }

  const featured = recentlyAdded[0] ?? continueWatching[0];

  return (
    <div className="home">
      <div className="home__top">
        <nav className="home__tabs" aria-label="Library categories">
          {tabs.map((tab) => {
            const isActive = tab.kind === 'view' && tab.id === 'home';
            return (
              <button
                key={`${tab.kind}-${tab.id}`}
                className={`home__tab ${isActive ? 'active' : ''}`}
                onClick={() => handleTabClick(tab)}
                title={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
        <div className="home__brand">Dhaka<b>Flix</b></div>
      </div>

      <Hero
        movie={featured}
        isNew={recentlyAdded.length > 0}
        onSelect={() => onMovieSelect(featured)}
      />

      <div className="home__rows">
        {continueWatching.length > 0 && (
          <PosterRow
            title="Continue watching"
            movies={continueWatching}
            onMovieClick={onMovieSelect}
            showProgress
            cardSize="large"
          />
        )}

        {recentlyAdded.length > 0 && (
          <PosterRow
            title="Just added"
            movies={recentlyAdded}
            onMovieClick={onMovieSelect}
            onSeeAll={() => onCategorySelect('__recent__')}
            showNewBadge
            cardSize="large"
          />
        )}

        {categoryRows.map((row) => (
          <PosterRow
            key={row.category}
            title={row.category}
            movies={row.movies}
            onMovieClick={onMovieSelect}
            onSeeAll={() => onCategorySelect(row.category)}
            cardSize="large"
          />
        ))}
      </div>
    </div>
  );
}
