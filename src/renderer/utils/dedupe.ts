/**
 * Shared dedupe helper for Home rails.
 *
 * Rails are rendered in priority order and pass the same `seen` set, so the
 * first occurrence of a title wins and lower-priority rails drop it.
 */

import type { Movie } from '../types';

export function takeUnique(movies: readonly Movie[], seen: Set<number>): Movie[] {
  const result: Movie[] = [];
  for (const movie of movies) {
    if (seen.has(movie.id)) continue;
    seen.add(movie.id);
    result.push(movie);
  }
  return result;
}
