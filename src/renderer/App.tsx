/**
 * Root Application Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import TitleBar from './components/layout/TitleBar';
import Sidebar from './components/layout/Sidebar';
import Home from './views/Home';
import Category from './views/Category';
import Detail from './views/Detail';
import Search from './views/Search';
import Settings from './views/Settings';
import { useAppShortcuts } from './hooks/useKeyboard';
import type { Movie } from './types';

type View = 'home' | 'movies' | 'series' | 'search' | 'settings' | 'category' | 'detail';

interface NavigationState {
  view: View;
  category?: string;
  movie?: Movie;
  previousView?: View;
}

export default function App() {
  const [nav, setNav] = useState<NavigationState>({ view: 'home' });
  const [isReady, setIsReady] = useState(false);

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
      previousView: prev.view !== 'detail' && prev.view !== 'category' ? prev.view : prev.previousView 
    }));
  }, []);

  const navigateToCategory = useCallback((category: string) => {
    setNav((prev) => ({ 
      view: 'category', 
      category, 
      previousView: prev.view 
    }));
  }, []);

  const navigateToDetail = useCallback((movie: Movie) => {
    setNav((prev) => ({ 
      view: 'detail', 
      movie, 
      previousView: prev.view,
      category: prev.category 
    }));
  }, []);

  const goBack = useCallback(() => {
    setNav((prev) => {
      if (prev.view === 'detail') {
        return { 
          view: prev.previousView || 'home', 
          category: prev.category 
        };
      }
      if (prev.view === 'category') {
        return { view: prev.previousView || 'home' };
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

  // Map sidebar views
  const sidebarView = 
    nav.view === 'category' || nav.view === 'detail' 
      ? (nav.previousView as 'home' | 'movies' | 'series' | 'search' | 'settings') || 'home'
      : nav.view;

  return (
    <div className="app">
      <TitleBar />
      <div className="app-container">
        <Sidebar 
          currentView={sidebarView} 
          onNavigate={navigate} 
        />
        <main className="content">
          {nav.view === 'home' && (
            <Home 
              onMovieSelect={navigateToDetail}
              onCategorySelect={navigateToCategory}
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
    </div>
  );
}
