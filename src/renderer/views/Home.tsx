/**
 * Home View
 *
 * Trending-aware hero and real rails built from the batched home payload,
 * the local DB and Cinemeta top catalogs. No filters on Home; no fabricated
 * ratings or artwork. Continue Watching is always the first rail below hero.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import HeroCarousel from '../components/media/HeroCarousel';
import PosterRow from '../components/media/PosterRow';
import ContinueCard from '../components/media/ContinueCard';
import { useCatalogMetadata } from '../hooks/useCatalogMetadata';
import { applyContinueWatchingEvent } from '../utils/continueWatching';
import type {
  CategoryCount,
  Movie,
  MovieWithProgress,
  PlayerProgress,
  TrendingItem,
} from '../types';
import './Home.css';

interface HomeProps {
  onMovieSelect: (movie: Movie) => void;
  onCategorySelect: (category: string) => void;
  onNavigate: (view: 'home' | 'movies' | 'series' | 'mylist') => void;
  categories: CategoryCount[];
  /** Real VLC status; only the watching rail reacts to it. */
  progressEvent?: PlayerProgress | null;
  carouselPaused?: boolean;
}

interface CategoryRow {
  category: string;
  movies: Movie[];
}

interface TrendingState {
  movie: TrendingItem[];
  series: TrendingItem[];
}

/** Real library categories that keep their existing Home rails. */
const CATEGORY_RAILS: ReadonlyArray<readonly [string, string]> = [
  ['Awards & TV Shows', 'Award shows and specials'],
  ['Documentary', 'Real stories and documentaries'],
];

const TOP_RATED_CATEGORY = 'IMDb Top-250 Movies';
const TRENDING_LIMIT = 20;
const RAIL_LIMIT = 18;
const EMPTY_TRENDING: TrendingState = { movie: [], series: [] };

const SKELETON_ROWS: readonly [string, string][] = [
  ['Just added', 'Fresh on your library'],
  ['Movies Trending', 'Popular now, matched in your library'],
  ['Movies Top Rated', 'IMDb Top-250 Movies in your library'],
  ['Series Trending', 'Popular series in your library'],
  ['Series Top Rated', 'Highest IMDb-rated trending series'],
  [CATEGORY_RAILS[0][0], CATEGORY_RAILS[0][1]],
  [CATEGORY_RAILS[1][0], CATEGORY_RAILS[1][1]],
];

/** Trending matches survive in-memory navigation, so the hero mounts at once. */
let cachedTrending: TrendingState | null = null;

function rowsForCategory(category: string, movies: Movie[]): CategoryRow | null {
  return movies.length > 0 ? { category, movies } : null;
}

export default function Home({
  onMovieSelect,
  onCategorySelect,
  onNavigate,
  categories: _categories,
  progressEvent,
  carouselPaused = false,
}: HomeProps) {
  const [watching, setWatching] = useState<MovieWithProgress[]>([]);
  const [recent, setRecent] = useState<Movie[]>([]);
  const [topRatedPool, setTopRatedPool] = useState<Movie[]>([]);
  const [legacyRows, setLegacyRows] = useState<CategoryRow[]>([]);
  const [trending, setTrending] = useState<TrendingState>(cachedTrending ?? EMPTY_TRENDING);
  const [loading, setLoading] = useState(true);
  const [trendingSettled, setTrendingSettled] = useState(Boolean(cachedTrending));
  const watchingRef = useRef(watching);
  const poolRef = useRef<readonly Movie[]>([]);

  useEffect(() => {
    let cancelled = false;

    // Local data first: the shell paints rows from SQLite before any network
    // call resolves. Trending is a second, independent fetch that swaps in.
    const loadLocal = async () => {
      try {
        const [data, topRatedResult] = await Promise.all([
          window.api.home.get(),
          window.api.db.getMovies({
            category: TOP_RATED_CATEGORY,
            limit: 24,
            offset: 0,
            sortBy: 'added',
            sortOrder: 'desc',
          }),
        ]);
        if (cancelled) return;

        watchingRef.current = data.watching;
        setWatching(data.watching);
        setRecent(data.recent);
        setTopRatedPool(topRatedResult.movies);
        setLoading(false);

        // The batch caps category rows; restore the two existing rails by name.
        const categoryRows = await Promise.all(CATEGORY_RAILS.map(async ([category]) => {
          const batched = data.categoryRows.find((row) => row.category === category);
          if (batched) return rowsForCategory(category, batched.movies);
          try {
            const result = await window.api.db.getMovies({
              category,
              limit: 12,
              offset: 0,
              sortBy: 'added',
              sortOrder: 'desc',
            });
            return rowsForCategory(category, result.movies);
          } catch {
            return null;
          }
        }));
        if (!cancelled) {
          setLegacyRows(categoryRows.filter((row): row is CategoryRow => row !== null));
        }
      } catch (error) {
        console.error('Failed to fetch home data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const loadTrending = async () => {
      try {
        const [movieTrending, seriesTrending] = await Promise.all([
          window.api.meta.getTrendingMovies('movie', TRENDING_LIMIT),
          window.api.meta.getTrendingMovies('series', TRENDING_LIMIT),
        ]);
        if (cancelled) return;

        const nextTrending: TrendingState = {
          movie: movieTrending.ok && Array.isArray(movieTrending.items) ? movieTrending.items : [],
          series: seriesTrending.ok && Array.isArray(seriesTrending.items) ? seriesTrending.items : [],
        };
        cachedTrending = nextTrending;
        setTrending(nextTrending);
      } catch (error) {
        console.error('Failed to fetch trending data:', error);
      } finally {
        if (!cancelled) setTrendingSettled(true);
      }
    };

    void loadLocal();
    void loadTrending();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshWatching = useCallback(async () => {
    try {
      const data = await window.api.home.get();
      watchingRef.current = data.watching;
      setWatching(data.watching);
    } catch (error) {
      console.error('Failed to refresh Continue Watching:', error);
    }
  }, []);

  // Progress events update the rail in place. A full read happens only when a
  // title enters or leaves Continue Watching; no polling and no hero remount.
  useEffect(() => {
    if (!progressEvent) return;
    const update = applyContinueWatchingEvent(
      watchingRef.current,
      progressEvent,
      new Set(poolRef.current.map((movie) => movie.href))
    );
    if (update.changed) {
      watchingRef.current = update.watching;
      setWatching(update.watching);
    }
    if (update.needsFullRefresh) void refreshWatching();
  }, [progressEvent, refreshWatching]);

  const pool = useMemo(() => {
    const all = [
      ...watching,
      ...recent,
      ...topRatedPool,
      ...legacyRows.flatMap((row) => row.movies),
      ...trending.movie.map((item) => item.movie),
      ...trending.series.map((item) => item.movie),
    ];
    return Array.from(new Map(all.map((movie) => [movie.id, movie])).values());
  }, [watching, recent, topRatedPool, legacyRows, trending]);

  poolRef.current = pool;
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
    }).slice(0, RAIL_LIMIT);
  }, [topRatedPool, metaById]);

  const seriesTopRated = useMemo(() => {
    const rated = trending.series.filter((item) => typeof item.rating === 'number');
    const unrated = trending.series.filter((item) => typeof item.rating !== 'number');
    return [...rated.sort((a, b) => b.rating! - a.rating!), ...unrated].slice(0, RAIL_LIMIT);
  }, [trending.series]);

  /** Hero picks come from trending matches; recent only if trending is down. */
  const heroMovies = useMemo(() => {
    const picks = [...trending.movie, ...trending.series]
      .slice(0, 8)
      .map((item) => item.movie);
    const unique = Array.from(new Map(picks.map((movie) => [movie.id, movie])).values());
    return unique.length > 0 ? unique : recent.slice(0, 8);
  }, [trending, recent]);

  const recentIds = useMemo(() => new Set(recent.slice(0, RAIL_LIMIT).map((movie) => movie.id)), [recent]);

  const renderContinueCard = useCallback((movie: Movie) => {
    const item = movie as MovieWithProgress;
    const backdrop: string | null = metaById.get(movie.id)?.backdrop_url ?? null;
    return (
      <ContinueCard
        movie={item}
        backdrop={backdrop}
        onClick={() => onMovieSelect(movie)}
      />
    );
  }, [metaById, onMovieSelect]);

  const hero = (
    <HeroCarousel
      movies={heroMovies}
      recentIds={recentIds}
      onSelect={onMovieSelect}
      onMoreInfo={onMovieSelect}
      paused={carouselPaused}
    />
  );

  const categoryRow = (name: string, subtitle: string) => {
    const row = legacyRows.find((item) => item.category === name);
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

  const hasContent = watching.length > 0 || recent.length > 0 || topRatedPool.length > 0
    || trending.movie.length > 0 || trending.series.length > 0 || legacyRows.length > 0;
  if (!loading && trendingSettled && !hasContent) {
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

  return (
    <div className={`home${loading ? ' home--loading' : ''}`}>
      {cachedTrending || !loading
        ? hero
        : <div className="home__hero-skeleton" aria-hidden="true" />}

      <div className="page">
        <div className="home__rows">
          {loading ? (
            SKELETON_ROWS.map(([title, subtitle]) => (
              <PosterRow
                key={title}
                title={title}
                subtitle={subtitle}
                movies={[]}
                loading
                onMovieClick={onMovieSelect}
              />
            ))
          ) : (
            <>
            {watching.length > 0 && (
              <PosterRow
                title="Continue Watching"
                subtitle="Pick up where you left off"
                movies={watching}
                renderCard={renderContinueCard}
                onMovieClick={onMovieSelect}
                metaById={metaById}
                cardSize="large"
              />
            )}
  
            {recent.length > 0 && (
              <PosterRow
                title="Just added"
                subtitle="Fresh on your library"
                movies={recent.slice(0, RAIL_LIMIT)}
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
                movies={trending.movie.slice(0, RAIL_LIMIT).map((item) => item.movie)}
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
                metaById={metaById}
                cardSize="large"
              />
            )}
  
            {trending.series.length > 0 && (
              <PosterRow
                title="Series Trending"
                subtitle="Popular series in your library"
                movies={trending.series.slice(0, RAIL_LIMIT).map((item) => item.movie)}
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
                onMovieClick={onMovieSelect}
                onSeeAll={() => onNavigate('series')}
                metaById={metaById}
                cardSize="large"
              />
            )}
  
            {CATEGORY_RAILS.map(([name, subtitle]) => categoryRow(name, subtitle))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
