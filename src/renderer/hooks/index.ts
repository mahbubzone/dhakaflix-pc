/**
 * Hooks Index
 */

export { useMovies, useSearch, useContinueWatching, useCategories } from './useMovies';
export { useCrawler } from './useCrawler';
export { usePlayer } from './usePlayer';
export { useMetadata } from './useMetadata';
export { useCatalogMetadata } from './useCatalogMetadata';
export { useSources } from './useSources';
export { useKeyboard, useAppShortcuts } from './useKeyboard';
export {
  useFavorite,
  useIsFavorite,
  applyFavoriteMembership,
} from './useFavorite';
export {
  useWatched,
  nextWatchedFlag,
  watchedFromProgress,
  withWatchedFlag,
} from './useWatched';
export {
  useWatchlist,
  useIsWatchlisted,
  refreshWatchlist,
  ensureWatchlistLoaded,
} from './useWatchlist';
