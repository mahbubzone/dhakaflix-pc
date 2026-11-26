/**
 * UI state persistence tests.
 */

import {
  getFilters,
  getScroll,
  loadUiState,
  resetUiStateCache,
  saveFilters,
  saveLastView,
  saveScroll,
  viewKey,
} from '../renderer/utils/uiState';
import { DEFAULT_CATALOG_FILTERS } from '../renderer/utils/filters';

describe('uiState persistence', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    Object.defineProperty(global, 'window', {
      value: {
        localStorage: {
          getItem: (key: string) => storage[key] ?? null,
          setItem: (key: string, value: string) => { storage[key] = value; },
        },
      },
      configurable: true,
      writable: true,
    });
    resetUiStateCache();
  });

  it('defaults to Home with no stored state', () => {
    expect(loadUiState().view).toBe('home');
    expect(getScroll('home')).toBe(0);
  });

  it('remembers the last view and category', () => {
    saveLastView('category', 'Documentary');
    const state = loadUiState();
    expect(state.view).toBe('category');
    expect(state.category).toBe('Documentary');
  });

  it('keeps scroll and filters in separate view buckets', () => {
    saveScroll('category:Documentary', 640);
    saveScroll('movies', 120);
    saveFilters('movies', { ...DEFAULT_CATALOG_FILTERS, year: '2024' });

    expect(getScroll(viewKey('category', 'Documentary'))).toBe(640);
    expect(getScroll('movies')).toBe(120);
    expect(getFilters('movies')?.year).toBe('2024');
    expect(getFilters('series')).toBeUndefined();
  });

  it('falls back to defaults for corrupt storage', () => {
    storage['dhakaflix.ui.v1'] = '{not json';
    resetUiStateCache();
    expect(loadUiState().view).toBe('home');
  });
});
