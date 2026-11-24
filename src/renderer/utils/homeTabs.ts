/**
 * Home tab derivation.
 *
 * The top tab row keeps Home / Movies / Series first, then uses real library
 * categories. Known Android TV categories keep their screenshot order; any
 * other library category follows. Home rows use the same order as the tabs.
 */

import type { CategoryCount } from '../types';

export type HomeTab =
  | { kind: 'view'; id: 'home' | 'movies' | 'series'; label: string }
  | { kind: 'category'; id: string; label: string };

const FEATURED_CATEGORIES = ['Anime & Cartoon', 'Korean', 'English', 'English 1080p'];
const EXCLUDED_CATEGORIES = new Set(['Home', 'Movies', 'Series']);

/** Library categories with screenshot names first, duplicates removed. */
export function getFeaturedCategoryOrder(categories: CategoryCount[]): string[] {
  const names = categories
    .map((category) => category.category)
    .filter((name) => !EXCLUDED_CATEGORIES.has(name));

  const featured = FEATURED_CATEGORIES.filter((name) => names.includes(name));
  const rest = names.filter((name) => !featured.includes(name));
  return [...featured, ...rest];
}

export function buildHomeTabs(categories: CategoryCount[], maxTabs = 7): HomeTab[] {
  const categorySlots = Math.max(0, maxTabs - 3);

  return [
    { kind: 'view', id: 'home', label: 'Home' },
    { kind: 'view', id: 'movies', label: 'Movies' },
    { kind: 'view', id: 'series', label: 'Series' },
    ...getFeaturedCategoryOrder(categories)
      .slice(0, categorySlots)
      .map((label): HomeTab => ({ kind: 'category', id: label, label })),
  ];
}
