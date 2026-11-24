/** Navigation targets that can be restored without movie/category state. */

export type NavigationView =
  | 'home'
  | 'movies'
  | 'series'
  | 'search'
  | 'settings'
  | 'category'
  | 'detail';

const SIMPLE_VIEWS = new Set<NavigationView>(['home', 'movies', 'series', 'search', 'settings']);

export function simpleBackView(view: NavigationView | undefined): NavigationView {
  return view && SIMPLE_VIEWS.has(view) ? view : 'home';
}
