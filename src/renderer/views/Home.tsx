/**
 * Home View
 * 
 * Main landing page with Continue Watching, Recently Added, and category rows.
 */

import React, { useState, useEffect, useCallback } from 'react';
import PosterRow from '../components/media/PosterRow';
import LoadingSpinner from '../components/common/LoadingSpinner';
import type { Movie } from '../types';
import './Home.css';

interface HomeProps {
  onMovieSelect: (movie: Movie) => void;
  onCategorySelect: (category: string) => void;
}

export default function Home({ onMovieSelect, onCategorySelect }: HomeProps) {
  const [continueWatching, setContinueWatching] = useState<Movie[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<Movie[]>([]);
  const [categoryRows, setCategoryRows] = useState<{ category: string; movies: Movie[] }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch in parallel
      const [watching, recent, categories] = await Promise.all([
        window.api.db.getContinueWatching(10),
        window.api.db.getMovies({ limit: 20, offset: 0, sortBy: 'added', sortOrder: 'desc' }),
        window.api.db.getCategories(),
      ]);

      setContinueWatching(watching);
      setRecentlyAdded(recent.movies);

      // Fetch movies for top categories
      const topCategories = categories.slice(0, 5);
      const categoryData = await Promise.all(
        topCategories.map(async (cat) => {
          const result = await window.api.db.getMovies({
            category: cat.category,
            limit: 15,
            offset: 0,
            sortBy: 'added',
            sortOrder: 'desc',
          });
          return { category: cat.category, movies: result.movies };
        })
      );

      setCategoryRows(categoryData.filter((c) => c.movies.length > 0));
    } catch (error) {
      console.error('Failed to fetch home data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  return (
    <div className="home">
      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <PosterRow
          title="Continue Watching"
          movies={continueWatching}
          onMovieClick={onMovieSelect}
        />
      )}

      {/* Recently Added */}
      {recentlyAdded.length > 0 && (
        <PosterRow
          title="Recently Added"
          movies={recentlyAdded}
          onMovieClick={onMovieSelect}
          onSeeAll={() => onCategorySelect('__recent__')}
        />
      )}

      {/* Category Rows */}
      {categoryRows.map((row) => (
        <PosterRow
          key={row.category}
          title={row.category}
          movies={row.movies}
          onMovieClick={onMovieSelect}
          onSeeAll={() => onCategorySelect(row.category)}
        />
      ))}
    </div>
  );
}
