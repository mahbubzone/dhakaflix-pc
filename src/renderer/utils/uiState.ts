/**
 * Persisted UI state.
 *
 * Remembers the last view, per-category filters, and scroll offsets between
 * launches. Stored in localStorage under one versioned key so a future schema
 * change can be discarded instead of crashing on stale shapes.
 */

import type { CatalogFilters } from './filters';

export type PersistedView = 'home' | 'movies' | 'series' | 'mylist' | 'settings' | 'category';

interface PersistedUiState {
  v: 1;
  view: PersistedView;
  category?: string;
  scroll: Record<string, number>;
  filters: Record<string, CatalogFilters>;
}

const STORAGE_KEY = 'dhakaflix.ui.v1';

const EMPTY: PersistedUiState = { v: 1, view: 'home', scroll: {}, filters: {} };

/** One parsed copy per renderer session; scroll writes stay cheap. */
let cached: PersistedUiState | null = null;

function isPersistedView(value: unknown): value is PersistedView {
  return value === 'home'
    || value === 'movies'
    || value === 'series'
    || value === 'mylist'
    || value === 'settings'
    || value === 'category';
}

export function loadUiState(): PersistedUiState {
  if (cached) return { ...cached };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cached = { ...EMPTY };
      return { ...cached };
    }

    const parsed = JSON.parse(raw) as Partial<PersistedUiState>;
    if (parsed.v !== 1 || !isPersistedView(parsed.view)) {
      cached = { ...EMPTY };
      return { ...cached };
    }

    cached = {
      v: 1,
      view: parsed.view,
      category: typeof parsed.category === 'string' ? parsed.category : undefined,
      scroll: parsed.scroll && typeof parsed.scroll === 'object' ? parsed.scroll : {},
      filters: parsed.filters && typeof parsed.filters === 'object' ? parsed.filters : {},
    };
    return { ...cached };
  } catch {
    // Corrupt or unavailable storage must never block startup.
    cached = { ...EMPTY };
    return { ...cached };
  }
}

function write(state: PersistedUiState): void {
  cached = state;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or privacy mode: persistence is best effort only.
  }
}

/** Test-only helper to drop the in-memory copy when storage is reset. */
export function resetUiStateCache(): void {
  cached = null;
}

/** Key used for scroll offsets and filters: one bucket per visible view. */
export function viewKey(view: string, category?: string): string {
  return view === 'category' && category ? `category:${category}` : view;
}

export function saveLastView(view: PersistedView, category?: string): void {
  const state = loadUiState();
  write({
    ...state,
    view,
    category: view === 'category' ? category : undefined,
  });
}

export function saveScroll(key: string, offset: number): void {
  const state = loadUiState();
  write({ ...state, scroll: { ...state.scroll, [key]: Math.max(0, Math.round(offset)) } });
}

export function getScroll(key: string): number {
  return loadUiState().scroll[key] ?? 0;
}

export function saveFilters(key: string, filters: CatalogFilters): void {
  const state = loadUiState();
  write({ ...state, filters: { ...state.filters, [key]: filters } });
}

export function getFilters(key: string): CatalogFilters | undefined {
  return loadUiState().filters[key];
}
