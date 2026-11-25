/**
 * Continue Watching updates from real player events.
 *
 * Rows are changed in place while playback is in progress. A full backend
 * reload is needed only when a title enters or leaves the rail.
 */

import type { MovieWithProgress } from '../types';

export interface ProgressEvent {
  movieId: number | null;
  href: string | null;
  position: number | null;
  duration: number | null;
  state: string | null;
}

export interface ContinueWatchUpdate {
  watching: MovieWithProgress[];
  changed: boolean;
  needsFullRefresh: boolean;
}

const WATCHED_RATIO = 0.95;
const UNCHANGED: ContinueWatchUpdate = {
  watching: [],
  changed: false,
  needsFullRefresh: false,
};

/** Backend marks a title watched at 95%; mirror that for the rail only. */
export function isWatchedProgress(
  position: number | null,
  duration: number | null
): boolean {
  if (
    typeof position !== 'number' || typeof duration !== 'number'
    || !Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0
  ) {
    return false;
  }
  return position / duration >= WATCHED_RATIO;
}

export function applyContinueWatchingEvent(
  watching: readonly MovieWithProgress[],
  event: ProgressEvent,
  knownHrefs: ReadonlySet<string>
): ContinueWatchUpdate {
  if (!event.href || typeof event.position !== 'number' || typeof event.duration !== 'number'
    || !Number.isFinite(event.position) || !Number.isFinite(event.duration)
    || event.duration <= 0) {
    return { ...UNCHANGED, watching: [...watching] };
  }

  const index = watching.findIndex((item) => item.href === event.href
    && (event.movieId === null || item.id === event.movieId));
  const watched = isWatchedProgress(event.position, event.duration);

  if (index >= 0) {
    if (watched || event.position <= 0) {
      return {
        watching: watching.filter((_, position) => position !== index),
        changed: true,
        needsFullRefresh: true,
      };
    }
    const next = [...watching];
    next[index] = { ...next[index], position: event.position, duration: event.duration };
    return { watching: next, changed: true, needsFullRefresh: false };
  }

  // A known href entering the rail needs one backend read for its movie row.
  // Episode hrefs are not in the movie pool and are ignored here.
  if (event.movieId !== null && !watched && event.position > 0
    && knownHrefs.has(event.href)) {
    return { watching: [...watching], changed: false, needsFullRefresh: true };
  }

  return { watching: [...watching], changed: false, needsFullRefresh: false };
}
