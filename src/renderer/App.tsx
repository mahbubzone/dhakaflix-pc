/**
 * Root Application Component
 *
 * Shell: window title bar, persistent top navigation, one active view and a
 * detail overlay. All backend navigation rules are preserved.
 */

import React, { useState, useEffect, useCallback } from 'react';
import TopNav, { type TopNavId } from './components/layout/TopNav';
import WindowChrome from './components/layout/WindowChrome';
import ShortcutSheet from './components/layout/ShortcutSheet';
import UpdateBanner from './components/layout/UpdateBanner';
import { useCategories } from './hooks/useMovies';
import Home from './views/Home';
import Category from './views/Category';
import MyList from './views/MyList';
import Detail from './views/Detail';
import Search from './views/Search';
import Settings, { type SettingsSection } from './views/Settings';
import { useAppShortcuts } from './hooks/useKeyboard';
import { simpleBackView, type NavigationView } from './utils/navigation';
import type { Movie, PlayerProgress } from './types';

type View = NavigationView;

interface NavigationState {
  view: View;
  category?: string;
  movie?: Movie;
  previousView?: View;
  /** The view visible underneath the detail overlay. */
  background?: { view: NavigationView; category?: string };
  /** Back target of the view underneath, so Back can walk through a category. */
  backgroundPrevious?: View;
}

export default function App() {
  const [nav, setNav] = useState<NavigationState>({ view: 'home' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>('sources');
  const [progressEvent, setProgressEvent] = useState<PlayerProgress | null>(null);
  const { categories } = useCategories();

  // Player detection is only a warning source. It must never gate the shell,
  // so the UI paints immediately and the check finishes in the background.
  useEffect(() => {
    window.api.player.getAvailable()
      .then((players) => {
        const hasPlayer = players.some((player) => player.installed);
        if (!hasPlayer) {
          console.warn('No video player found. Please install VLC or PotPlayer.');
        }
      })
      .catch(() => {
        console.warn('Player detection failed; continuing with playback defaults.');
      });
  }, []);

  // Real VLC progress events refresh open views; no polling is involved.
  useEffect(() => window.api.player.onProgress(setProgressEvent), []);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const navigate = useCallback((view: View) => {
    // Search is a modal over the current view, never a separate page.
    if (view === 'search') {
      setSearchOpen(true);
      return;
    }
    setSearchQuery('');
    setNav((prev) => ({
      view,
      previousView: simpleBackView(prev.view),
    }));
  }, []);

  const navigateToCategory = useCallback((category: string) => {
    setSearchQuery('');
    setNav((prev) => ({
      view: 'category',
      category,
      previousView: simpleBackView(prev.view === 'detail' || prev.view === 'category'
        ? prev.previousView
        : prev.view),
    }));
  }, []);

  const navigateToDetail = useCallback((movie: Movie) => {
    setNav((prev) => ({
      view: 'detail',
      movie,
      previousView: prev.view === 'detail' ? prev.previousView : prev.view,
      category: prev.category,
      background: prev.view === 'detail'
        ? prev.background
        : { view: prev.view, category: prev.category },
      backgroundPrevious: prev.view === 'detail'
        ? prev.backgroundPrevious
        : prev.previousView,
    }));
  }, []);

  const goBack = useCallback(() => {
    if (shortcutsOpen) {
      setShortcutsOpen(false);
      return;
    }
    if (searchOpen) {
      setSearchOpen(false);
      return;
    }
    setNav((prev) => {
      if (prev.view === 'detail') {
        if (!prev.movie) return { view: 'home' };
        const backView = prev.background?.view ?? prev.previousView ?? 'home';
        const backPrevious = simpleBackView(prev.backgroundPrevious);
        if (backView === 'category' && prev.background?.category) {
          return {
            view: 'category',
            category: prev.background.category,
            previousView: backPrevious,
          };
        }
        return {
          view: simpleBackView(backView),
          category: prev.category,
          previousView: backPrevious,
        };
      }
      if (prev.view === 'category') {
        return { view: simpleBackView(prev.previousView) };
      }
      return { view: 'home' };
    });
  }, [searchOpen, shortcutsOpen]);

  const isDetail = nav.view === 'detail';
  const rawView = isDetail ? (nav.background?.view ?? nav.previousView ?? 'home') : nav.view;
  const rawCategory = isDetail ? (nav.background?.category ?? nav.category) : nav.category;
  const baseView: View = rawView === 'category' && !rawCategory ? 'home' : rawView;

  useAppShortcuts({
    onSearch: () => { if (!shortcutsOpen) openSearch(); },
    onSettings: () => {
      if (shortcutsOpen) return;
      setSettingsSection('sources');
      navigate('settings');
    },
    onBack: goBack,
    onHome: () => { if (!shortcutsOpen) navigate('home'); },
    onToggleFullscreen: () => window.api.window.toggleFullscreen(),
    onHelp: () => setShortcutsOpen((open) => !open),
  });

  const activeTopNav: TopNavId | null =
    baseView === 'home' ? 'home'
      : baseView === 'movies' ? 'movies'
        : baseView === 'series' ? 'series'
          : baseView === 'mylist' ? 'mylist'
            : baseView === 'category'
              ? (rawCategory === 'Documentary' ? 'documentary'
                : rawCategory === 'Awards & TV Shows' ? 'awards' : null)
              : null;

  const renderBaseView = () => {
    switch (baseView) {
      case 'home':
        return (
          <Home
            onMovieSelect={navigateToDetail}
            onCategorySelect={navigateToCategory}
            onNavigate={navigate}
            categories={categories}
            progressEvent={progressEvent}
            carouselPaused={isDetail}
          />
        );
      case 'movies':
        return (
          <Category
            category="__movies__"
            onMovieSelect={navigateToDetail}
          />
        );
      case 'series':
        return (
          <Category
            category="__series__"
            onMovieSelect={navigateToDetail}
          />
        );
      case 'category':
        return rawCategory ? (
          <Category
            category={rawCategory}
            onMovieSelect={navigateToDetail}
          />
        ) : null;
      case 'mylist':
        return <MyList onMovieSelect={navigateToDetail} />;
      case 'settings':
        return <Settings initialSection={settingsSection} />;
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <WindowChrome />

      <TopNav
        active={activeTopNav}
        categories={categories}
        query={searchQuery}
        onOpenSearch={openSearch}
        onNavigateView={navigate}
        onNavigateCategory={navigateToCategory}
        onOpenSettings={() => {
          setSettingsSection('sources');
          navigate('settings');
        }}
      />

      <main className={`content ${baseView === 'home' ? 'content--home' : ''}`}>
        {renderBaseView()}
      </main>

      {nav.view === 'detail' && nav.movie && (
        <Detail movie={nav.movie} onBack={goBack} />
      )}

      {searchOpen && (
        <Search
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onMovieSelect={navigateToDetail}
          onClose={closeSearch}
        />
      )}

      <ShortcutSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <UpdateBanner
        onOpenSettings={() => {
          setSettingsSection('updates');
          navigate('settings');
        }}
      />
    </div>
  );
}
