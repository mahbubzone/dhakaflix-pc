/**
 * Persistent top navigation bar.
 *
 * Brand, primary views, real category shortcuts, a search field that opens the
 * centered search modal, and settings.
 */

import React from 'react';
import Icon, { type IconName } from '../common/Icon';
import { getCategoryLabel } from '../../utils/homeTabs';
import type { CategoryCount } from '../../types';
import './TopNav.css';

export type TopNavId = 'home' | 'movies' | 'series' | 'mylist' | 'documentary' | 'awards';

const NAV_ICONS: Record<TopNavId, IconName> = {
  home: 'house',
  movies: 'clapperboard',
  series: 'tv',
  documentary: 'file-video',
  awards: 'trophy',
  mylist: 'bookmark',
};

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
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
            onClick={item.onClick}
            aria-current={active === item.id ? 'page' : undefined}
          >
            <Icon name={NAV_ICONS[item.id]} style={{ fontSize: 'var(--icon-nav)' }} />
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
        <Icon
          className="topnav__search-icon"
          name="search"
          style={{ fontSize: 'var(--icon-nav)' }}
        />
        {query || 'Search movies and series...'}
      </button>

      <button
        className="topnav__avatar"
        onClick={onOpenSettings}
        title="Settings"
        aria-label="Open settings"
      >
        <Icon name="settings" style={{ fontSize: 'var(--icon-nav)' }} />
      </button>
    </nav>
  );
}
