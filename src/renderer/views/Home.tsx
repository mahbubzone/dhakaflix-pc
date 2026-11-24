/**
 * Home View
 *
 * Trending-aware hero and real rails built from the local DB and Cinemeta
 * top catalogs. No filters on Home; no fabricated ratings or artwork.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import HeroCarousel from '../components/media/HeroCarousel';
import PosterRow from '../components/media/PosterRow';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useCatalogMetadata } from '../hooks/useCatalogMetadata';
import type { CategoryCount, Movie, TrendingItem } from '../types';
import './Home.css';

interface HomeProps {
  onMovieSelect: (movie: Movie) => void;
  onCategorySelect: (category: string) => void;
  onNavigate: (view: 'home' | 'movies' | 'series') => void;
  categories: CategoryCount[];
  carouselPaused?: boolean;
}

/** Real library categories, in the requested display order. */
const CATEGORY_RAILS: ReadonlyArray<readonly [string, string]> = [
  ['Awards & TV Shows', 'Award shows and specials'],
  ['Documentary', 'Real stories and documentaries'],
];

const TOP_RATED_CATEGORY = 'IMDb Top-250 Movies';
const TRENDING_LIMIT = 20;

export default function Home({
  onMovieSelect,
  onCategorySelect,
  onNavigate,
  categories,
  carouselPaused = false,
}: HomeProps) {
  const [recent, setRecent] = useState<Movie[]>([]);
  const [topRatedPool, setTopRatedPool] = useState<Movie[]>([]);
  const [categoryRows, setCategoryRows] = useState<{ category: string; movies: Movie[] }[]>([]);
  const [trending, setTrending] = useState<{ movie: TrendingItem[]; series: TrendingItem[] }>({
    movie: [],
    series: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const names = CATEGORY_RAILS
        .map(([category]) => category)
        .filter((name) => categories.some((category) => category.category === name));

      // Trending runs in main against the Cinemeta cache; matched titles get
      // real metadata written before the renderer asks for cached ratings.
      const [recentResult, topRatedResult, movieTrending, seriesTrending] = await Promise.all([
        window.api.db.getMovies({ limit: 40, offset: 0, sortBy: 'added', sortOrder: 'desc' }),
        window.api.db.getMovies({
          category: TOP_RATED_CATEGORY,
          limit: 24,
          offset: 0,
          sortBy: 'added',
          sortOrder: 'desc',
        }),
        window.api.meta.getTrendingMovies('movie', TRENDING_LIMIT),
        window.api.meta.getTrendingMovies('series', TRENDING_LIMIT),
      ]);

      setRecent(recentResult.movies);
      setTopRatedPool(topRatedResult.movies);
      setTrending({
        movie: movieTrending.ok && Array.isArray(movieTrending.items) ? movieTrending.items : [],
        series: seriesTrending.ok && Array.isArray(seriesTrending.items) ? seriesTrending.items : [],
      });

      const rows = await Promise.all(names.map(async (category) => {
        const result = await window.api.db.getMovies({
          category,
          limit: 15,
          offset: 0,
          sortBy: 'added',
          sortOrder: 'desc',
        });
        return { category, movies: result.movies };
      }));
      setCategoryRows(rows.filter((row) => row.movies.length > 0));
    } catch (error) {
      console.error('Failed to fetch home data:', error);
    } finally {
      setLoading(false);
    }
  }, [categories]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pool = useMemo(() => {
    const all = [
      ...recent,
      ...topRatedPool,
      ...categoryRows.flatMap((row) => row.movies),
      ...trending.movie.map((item) => item.movie),
      ...trending.series.map((item) => item.movie),
    ];
    return Array.from(new Map(all.map((movie) => [movie.id, movie])).values());
  }, [recent, topRatedPool, categoryRows, trending]);

  const metaById = useCatalogMetadata(pool);

  const topRated = useMemo(() => {
    const ratingOf = (id: number) => metaById.get(id)?.rating;
    return [...topRatedPool].sort((a, b) => {
      const ra = ratingOf(a.id);
      const rb = ratingOf(b.id);
      const hasA = typeof ra === 'number';
      const hasB = typeof rb === 'number';
      if (hasA !== hasB) return hasA ? -1 : 1;
      if (hasA && hasB && ra !== rb) return rb! - ra!;
      // Library ids follow the real IMDb Top-250 order.
      return a.id - b.id;
    }).slice(0, 15);
  }, [topRatedPool, metaById]);

  const seriesTopRated = useMemo(() => {
    const rated = trending.series.filter((item) => typeof item.rating === 'number');
    const unrated = trending.series.filter((item) => typeof item.rating !== 'number');
    return [...rated.sort((a, b) => b.rating! - a.rating!), ...unrated].slice(0, 12);
  }, [trending.series]);

  /** Hero picks come from trending matches; recent only if trending is down. */
  const heroMovies = useMemo(() => {
    const picks = [...trending.movie, ...trending.series]
      .slice(0, 8)
      .map((item) => item.movie);
    const unique = Array.from(new Map(picks.map((movie) => [movie.id, movie])).values());
    return unique.length > 0 ? unique : recent.slice(0, 8);
  }, [trending, recent]);

  const recentIds = useMemo(() => new Set(recent.slice(0, 15).map((movie) => movie.id)), [recent]);

  if (loading) {
    return (
      <div className="home home--loading">
        <LoadingSpinner size="large" label="Loading..." />
      </div>
    );
  }

  const hasContent = recent.length > 0 || trending.movie.length > 0
    || trending.series.length > 0 || categoryRows.length > 0;
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

  const categoryRow = (name: string, subtitle: string) => {
    const row = categoryRows.find((item) => item.category === name);
    if (!row || row.movies.length === 0) return null;
    return (
      <PosterRow
        key={row.category}
        title={row.category}
        subtitle={subtitle}
        movies={row.movies}
        onMovieClick={onMovieSelect}
        onSeeAll={() => onCategorySelect(row.category)}
        metaById={metaById}
        cardSize="large"
      />
    );
  };

  return (
    <div className="home">
      <HeroCarousel
        movies={heroMovies}
        isTrending={trending.movie.length > 0 || trending.series.length > 0}
        recentIds={recentIds}
        onSelect={onMovieSelect}
        onMoreInfo={onMovieSelect}
        paused={carouselPaused}
      />

      <div className="page">
        <div className="home__rows">
          {recent.length > 0 && (
            <PosterRow
              title="Just added"
              subtitle="Fresh on your library"
              movies={recent.slice(0, 15)}
              onMovieClick={onMovieSelect}
              onSeeAll={() => onCategorySelect('__recent__')}
              showNewBadge
              metaById={metaById}
              cardSize="large"
            />
          )}

          {trending.movie.length > 0 && (
            <PosterRow
              title="Movies Trending"
              subtitle="Popular now, matched in your library"
              movies={trending.movie.slice(0, 15).map((item) => item.movie)}
              ranks={trending.movie.slice(0, 15).map((item) => item.rank)}
              onMovieClick={onMovieSelect}
              onSeeAll={() => onNavigate('movies')}
              metaById={metaById}
              cardSize="large"
            />
          )}

          {topRated.length > 0 && (
            <PosterRow
              title="Movies Top Rated"
              subtitle="IMDb Top-250 Movies in your library"
              movies={topRated}
              onMovieClick={onMovieSelect}
              onSeeAll={() => onNavigate('movies')}
              numbered
              metaById={metaById}
              cardSize="large"
            />
          )}

          {trending.series.length > 0 && (
            <PosterRow
              title="Series Trending"
              subtitle="Popular series in your library"
              movies={trending.series.slice(0, 15).map((item) => item.movie)}
              ranks={trending.series.slice(0, 15).map((item) => item.rank)}
              onMovieClick={onMovieSelect}
              onSeeAll={() => onNavigate('series')}
              metaById={metaById}
              cardSize="large"
            />
          )}

          {seriesTopRated.length > 0 && (
            <PosterRow
              title="Series Top Rated"
              subtitle="Highest IMDb-rated trending series"
              movies={seriesTopRated.map((item) => item.movie)}
              ranks={seriesTopRated.map((item) => item.rank)}
              onMovieClick={onMovieSelect}
              onSeeAll={() => onNavigate('series')}
              metaById={metaById}
              cardSize="large"
            />
          )}

          {CATEGORY_RAILS.map(([name, subtitle]) => categoryRow(name, subtitle))}
        </div>
      </div>
    </div>
  );
}
