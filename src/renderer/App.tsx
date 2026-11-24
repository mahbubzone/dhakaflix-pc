/**
 * Root Application Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import TitleBar from './components/layout/TitleBar';
import Sidebar, { type SidebarView } from './components/layout/Sidebar';
import UpdateBanner from './components/layout/UpdateBanner';
import { useCategories } from './hooks/useMovies';
import Home from './views/Home';
import Category from './views/Category';
import Detail from './views/Detail';
import Search from './views/Search';
import Settings from './views/Settings';
import { useAppShortcuts } from './hooks/useKeyboard';
import { simpleBackView, type NavigationView } from './utils/navigation';
import type { Movie } from './types';

type View = NavigationView;

interface NavigationState {
  view: View;
  category?: string;
  movie?: Movie;
  previousView?: View;
}

export default function App() {
  const [nav, setNav] = useState<NavigationState>({ view: 'home' });
  const [isReady, setIsReady] = useState(false);
  const { categories } = useCategories();

  useEffect(() => {
    // Check for available players on startup
    window.api.player.getAvailable().then((players) => {
      const hasPlayer = players.some(p => p.installed);
      if (!hasPlayer) {
        console.warn('No video player found. Please install VLC or PotPlayer.');
      }
      setIsReady(true);
    });
  }, []);

  const navigate = useCallback((view: View) => {
    setNav((prev) => ({
      view,
      previousView: simpleBackView(prev.view),
    }));
  }, []);

  const navigateToCategory = useCallback((category: string) => {
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
      previousView: simpleBackView(prev.view),
      category: prev.category,
    }));
  }, []);

  const handleSidebarNavigate = useCallback((view: SidebarView) => {
    if (view === 'category') {
      const firstCategory = categories[0]?.category;
      if (firstCategory) {
        navigateToCategory(firstCategory);
      }
      return;
    }
    navigate(view);
  }, [categories, navigate, navigateToCategory]);

  const goBack = useCallback(() => {
    setNav((prev) => {
      if (prev.view === 'detail') {
        if (!prev.movie) return { view: 'home' };
        return {
          view: simpleBackView(prev.previousView),
          category: prev.category,
        };
      }
      if (prev.view === 'category') {
        return { view: simpleBackView(prev.previousView) };
      }
      if (prev.view === 'search') {
        return { view: 'home' };
      }
      return { view: 'home' };
    });
  }, []);

  // Keyboard shortcuts
  useAppShortcuts({
    onSearch: () => navigate('search'),
    onSettings: () => navigate('settings'),
    onBack: goBack,
    onHome: () => navigate('home'),
  });

  if (!isReady) {
    return (
      <div className="app loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  // Detail keeps the active rail item from the view that opened it.
  const sidebarView: SidebarView =
    nav.view === 'detail'
      ? (nav.previousView as SidebarView | undefined) || 'home'
      : nav.view;

  return (
    <div className="app">
      <TitleBar />
      <div className="app-container">
        <Sidebar 
          currentView={sidebarView} 
          onNavigate={handleSidebarNavigate} 
        />
        <main className={`content ${nav.view === 'home' ? 'content--home' : ''}`}>
          {nav.view === 'home' && (
            <Home 
              onMovieSelect={navigateToDetail}
              onCategorySelect={navigateToCategory}
              onNavigate={navigate}
              categories={categories}
            />
          )}
          
          {nav.view === 'movies' && (
            <Category 
              category="__movies__"
              onMovieSelect={navigateToDetail}
              onBack={() => navigate('home')}
            />
          )}
          
          {nav.view === 'series' && (
            <Category 
              category="__series__"
              onMovieSelect={navigateToDetail}
              onBack={() => navigate('home')}
            />
          )}
          
          {nav.view === 'category' && nav.category && (
            <Category 
              category={nav.category}
              onMovieSelect={navigateToDetail}
              onBack={goBack}
            />
          )}
          
          {nav.view === 'detail' && nav.movie && (
            <Detail 
              movie={nav.movie}
              onBack={goBack}
            />
          )}
          
          {nav.view === 'search' && (
            <Search 
              onMovieSelect={navigateToDetail}
              onClose={goBack}
            />
          )}
          
          {nav.view === 'settings' && <Settings />}
        </main>
      </div>
      <UpdateBanner onOpenSettings={() => navigate('settings')} />
    </div>
  );
}
