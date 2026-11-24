/**
 * Search View
 * 
 * Search input with results grid.
 */

import React from 'react';
import SearchBar from '../components/common/SearchBar';
import PosterGrid from '../components/media/PosterGrid';
import { useSearch } from '../hooks/useMovies';
import type { Movie } from '../types';
import './Search.css';

interface SearchProps {
  onMovieSelect: (movie: Movie) => void;
  onClose: () => void;
}

export default function Search({ onMovieSelect, onClose }: SearchProps) {
  const { query, setQuery, results, loading, hasQuery } = useSearch(300);

  return (
    <div className="search">
      <div className="search__header">
        <SearchBar
          value={query}
          onChange={setQuery}
          onClose={onClose}
          autoFocus
        />
      </div>

      <div className="search__results">
        {!hasQuery ? (
          <div className="search__empty">
            <span className="search__empty-icon">🔍</span>
            <p>Search for movies and TV series</p>
            <p className="search__hint">Try typing a movie title, year, or actor name</p>
          </div>
        ) : loading ? (
          <div className="search__loading">
            <div className="search__spinner" />
            <p>Searching...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="search__empty">
            <span className="search__empty-icon">🤷</span>
            <p>No results for "{query}"</p>
            <p className="search__hint">Try different keywords or check the spelling</p>
          </div>
        ) : (
          <>
            <div className="search__count">
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </div>
            <PosterGrid movies={results} onMovieClick={onMovieSelect} />
          </>
        )}
      </div>
    </div>
  );
}
