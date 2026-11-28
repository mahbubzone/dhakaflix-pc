/**
 * Home View
 *
 * Trending-aware hero and real rails built from the batched home payload,
 * the local DB and Cinemeta top catalogs. No filters on Home; no fabricated
 * ratings or artwork. Continue Watching is always the first rail below hero.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Icon from '../components/common/Icon';
import HeroCarousel from '../components/media/HeroCarousel';
import PosterRow from '../components/media/PosterRow';
import ContinueCard from '../components/media/ContinueCard';
import { useCatalogMetadata } from '../hooks/useCatalogMetadata';
import { applyContinueWatchingEvent } from '../utils/continueWatching';
import { takeUnique } from '../utils/dedupe';
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
  ['Continue Watching', 'Pick up where you left off'],
  ['Trending', 'Popular now, matched in your library'],
  ['Recently Added', 'Fresh on your library'],
  [CATEGORY_RAILS[0][0], CATEGORY_RAILS[0][1]],
  [CATEGORY_RAILS[1][0], CATEGORY_RAILS[1][1]],
  ['Top Rated', 'IMDb Top-250 Movies in your library'],
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

  /** One Trending rail from real Cinemeta ranks; no invented ordering or badges. */
  const trendingRail = useMemo(() => {
    const ranked = [...trending.movie, ...trending.series]
      .sort((a, b) => a.rank - b.rank);
    const unique = new Map<number, Movie>();
    for (const item of ranked) {
      if (!unique.has(item.movie.id)) unique.set(item.movie.id, item.movie);
    }
    return [...unique.values()].slice(0, RAIL_LIMIT);
  }, [trending]);

  /** Hero picks come from trending matches; recent only if trending is down. */
  const heroMovies = useMemo(() => {
    const picks = [...trending.movie, ...trending.series]
      .slice(0, 4)
      .map((item) => item.movie);
    const unique = Array.from(new Map(picks.map((movie) => [movie.id, movie])).values());
    // Keep at least one recent title for the rail when trending is down.
    return unique.length > 0 ? unique : recent.slice(0, 1);
  }, [trending, recent]);

  const recentIds = useMemo(() => new Set(recent.slice(0, RAIL_LIMIT).map((movie) => movie.id)), [recent]);

  /** Deleting saved progress removes the tile everywhere it is derived from. */
  const removeWatching = useCallback(async (movie: Movie) => {
    try {
      const result = await window.api.db.clearProgress(movie.href);
      if (!result.ok) {
        console.error('Failed to remove from Continue Watching:', result.error);
        return;
      }
      const next = watchingRef.current.filter((item) => item.href !== movie.href);
      watchingRef.current = next;
      setWatching(next);
    } catch (error) {
      console.error('Failed to remove from Continue Watching:', error);
    }
  }, []);

  const renderContinueCard = useCallback((movie: Movie) => {
    const item = movie as MovieWithProgress;
    const backdrop: string | null = metaById.get(movie.id)?.backdrop_url ?? null;
    return (
      <ContinueCard
        movie={item}
        backdrop={backdrop}
        onClick={() => onMovieSelect(movie)}
        onRemove={() => removeWatching(movie)}
      />
    );
  }, [metaById, onMovieSelect, removeWatching]);

  const hero = (
    <HeroCarousel
      movies={heroMovies}
      recentIds={recentIds}
      onSelect={onMovieSelect}
      onMoreInfo={onMovieSelect}
      paused={carouselPaused}
    />
  );

  // Priority order: Hero -> Continue -> Trending -> Recent -> Editorial.
  // A title shown in a higher-priority section is never repeated below it.
  const seenIds = new Set<number>();
  for (const movie of heroMovies) seenIds.add(movie.id);
  const continueMovies = takeUnique(watching, seenIds);
  const trendingMovies = takeUnique(trendingRail, seenIds);
  const recentMovies = takeUnique(recent.slice(0, RAIL_LIMIT), seenIds);

  const editorialRows = CATEGORY_RAILS.map(([name, subtitle]) => {
    const row = legacyRows.find((item) => item.category === name);
    if (!row) return null;
    const movies = takeUnique(row.movies, seenIds);
    return movies.length > 0 ? { name, subtitle, movies } : null;
  }).filter((row): row is { name: string; subtitle: string; movies: Movie[] } => row !== null);
  const editorialTopRated = takeUnique(topRated, seenIds);

  const hasContent = watching.length > 0 || recent.length > 0 || topRatedPool.length > 0
    || trending.movie.length > 0 || trending.series.length > 0 || legacyRows.length > 0;
  if (!loading && trendingSettled && !hasContent) {
    return (
      <div className="home home--empty">
        <div className="home__empty-state">
          <Icon
            className="home__empty-icon"
            name="tv"
            style={{ fontSize: 'var(--icon-empty)' }}
          />
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
        : <div className="home__hero-skeleton skeleton" aria-hidden="true" />}

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
            {continueMovies.length > 0 && (
              <PosterRow
                title="Continue Watching"
                subtitle="Pick up where you left off"
                movies={continueMovies}
                renderCard={renderContinueCard}
                onMovieClick={onMovieSelect}
                metaById={metaById}
                cardSize="large"
              />
            )}
  
            {trendingMovies.length > 0 && (
              <PosterRow
                title="Trending"
                subtitle="Popular now, matched in your library"
                movies={trendingMovies}
                onMovieClick={onMovieSelect}
                metaById={metaById}
                cardSize="large"
              />
            )}

            {recentMovies.length > 0 && (
              <PosterRow
                title="Recently Added"
                subtitle="Fresh on your library"
                movies={recentMovies}
                onMovieClick={onMovieSelect}
                onSeeAll={() => onCategorySelect('__recent__')}
                showNewBadge
                metaById={metaById}
                cardSize="large"
              />
            )}

            {editorialRows.map((row) => (
              <PosterRow
                key={row.name}
                title={row.name}
                subtitle={row.subtitle}
                movies={row.movies}
                onMovieClick={onMovieSelect}
                onSeeAll={() => onCategorySelect(row.name)}
                metaById={metaById}
                cardSize="large"
              />
            ))}

            {editorialTopRated.length > 0 && (
              <PosterRow
                title="Top Rated"
                subtitle="IMDb Top-250 Movies in your library"
                movies={editorialTopRated}
                onMovieClick={onMovieSelect}
                onSeeAll={() => onNavigate('movies')}
                metaById={metaById}
                cardSize="large"
              />
            )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
