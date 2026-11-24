/**
 * Home tab derivation.
 *
 * The top tab row keeps Home / Movies / Series first, then maps the real
 * library categories to the screenshot labels. Rows use the same order and
 * keep the real category id for the database query.
 */

import type { CategoryCount } from '../types';

export type HomeTab =
  | { kind: 'view'; id: 'home' | 'movies' | 'series'; label: string }
  | { kind: 'category'; id: string; label: string };

/** [library category, screenshot label]. */
const FEATURED_CATEGORIES: ReadonlyArray<readonly [string, string]> = [
  ['English Movies', 'English'],
  ['English Movies (1080p)', 'English 1080p'],
  ['Cartoon TV Series', 'Anime & Cartoon'],
  ['Korean TV & Web Series', 'Korean'],
  // The dedicated Series view covers this category; do not duplicate its tab.
  ['TV & Web Series', 'Series'],
  ['Documentary', 'Documentary'],
  ['Awards & TV Shows', 'Awards'],
];

const RESERVED_LABELS = new Set(['Home', 'Movies', 'Series']);
const EXCLUDED_CATEGORIES = new Set([
  ...RESERVED_LABELS,
  ...FEATURED_CATEGORIES
    .filter(([, label]) => RESERVED_LABELS.has(label))
    .map(([source]) => source),
]);

/** Screenshot label for a real library category, or the category itself. */
export function getCategoryLabel(category: string): string {
  return FEATURED_CATEGORIES.find(([source]) => source === category)?.[1] ?? category;
}

/** Real category names in screenshot order, then any remaining categories. */
export function getFeaturedCategoryOrder(categories: CategoryCount[]): string[] {
  const names = new Set(
    categories
      .map((category) => category.category)
      .filter((name) => !EXCLUDED_CATEGORIES.has(name))
  );

  const seen = new Set<string>();
  const featured: string[] = [];
  for (const [source, label] of FEATURED_CATEGORIES) {
    if (names.has(source) && !RESERVED_LABELS.has(label) && !seen.has(source)) {
      featured.push(source);
      seen.add(source);
    }
  }

  const rest = [...names].filter((name) => !seen.has(name));
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
      .map((id): HomeTab => ({ kind: 'category', id, label: getCategoryLabel(id) })),
  ];
}
