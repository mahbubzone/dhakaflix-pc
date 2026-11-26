/**
 * Persistent top navigation bar.
 *
 * Brand, primary views, real category shortcuts, a search field that opens the
 * centered search modal, and settings.
 */

import React from 'react';
import { getCategoryLabel } from '../../utils/homeTabs';
import type { CategoryCount } from '../../types';
import './TopNav.css';

export type TopNavId = 'home' | 'movies' | 'series' | 'mylist' | 'documentary' | 'awards';

interface TopNavProps {
  active: TopNavId | null;
  categories: CategoryCount[];
  query: string;
  onOpenSearch: () => void;
  onNavigateView: (view: 'home' | 'movies' | 'series' | 'mylist') => void;
  onNavigateCategory: (category: string) => void;
  onOpenSettings: () => void;
}

export default function TopNav({
  active,
  categories,
  query,
  onOpenSearch,
  onNavigateView,
  onNavigateCategory,
  onOpenSettings,
}: TopNavProps) {
  const hasCategory = (name: string) => categories.some((item) => item.category === name);

  const items: { id: TopNavId; label: string; onClick: () => void }[] = [
    { id: 'home', label: 'Home', onClick: () => onNavigateView('home') },
    { id: 'movies', label: 'Movies', onClick: () => onNavigateView('movies') },
    { id: 'series', label: 'Series', onClick: () => onNavigateView('series') },
  ];

  if (hasCategory('Documentary')) {
    items.push({
      id: 'documentary',
      label: getCategoryLabel('Documentary'),
      onClick: () => onNavigateCategory('Documentary'),
    });
  }
  if (hasCategory('Awards & TV Shows')) {
    items.push({
      id: 'awards',
      label: getCategoryLabel('Awards & TV Shows'),
      onClick: () => onNavigateCategory('Awards & TV Shows'),
    });
  }

  // Watchlist is always the last option, with no count badge.
  items.push({ id: 'mylist', label: 'Watchlist', onClick: () => onNavigateView('mylist') });

  return (
    <nav
      className="topnav"
      aria-label="Main navigation"
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest('button')) return;
        window.api.window.maximize();
      }}
    >
      <button
        className="topnav__brand"
        onClick={() => onNavigateView('home')}
        aria-label="DhakaFlix home"
      >
        Dhaka<b>Flix</b>
      </button>

      <div className="topnav__nav">
        {items.map((item) => (
          <button
            key={item.id}
            className={`topnav__link ${active === item.id ? 'active' : ''}`}
            onClick={item.onClick}
            aria-current={active === item.id ? 'page' : undefined}
          >
            {item.label}
          </button>
        ))}
      </div>

      <button
        className="topnav__search"
        onClick={onOpenSearch}
        aria-label="Open search"
        type="button"
      >
        <svg
          className="topnav__search-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        {query || 'Search movies and series...'}
      </button>

      <button
        className="topnav__avatar"
        onClick={onOpenSettings}
        title="Settings"
        aria-label="Open settings"
      >
        DF
      </button>
    </nav>
  );
}
