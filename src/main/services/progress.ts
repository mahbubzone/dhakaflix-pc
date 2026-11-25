/**
 * Reversible watched state.
 *
 * A watched toggle must never erase an existing resume position, duration or
 * episode link. The upsert below writes only the flag (and a movie id when the
 * row is new); conflicts keep every other progress value.
 */

export const SET_WATCHED_SQL = `
  INSERT INTO progress (href, movie_id, watched, position, duration, updated_at)
  VALUES (?, (SELECT id FROM movies WHERE href = ?), ?, 0, 0, strftime('%s', 'now'))
  ON CONFLICT(href) DO UPDATE SET
    movie_id = COALESCE(excluded.movie_id, progress.movie_id),
    watched = excluded.watched,
    position = progress.position,
    duration = progress.duration,
    episode_id = progress.episode_id,
    updated_at = strftime('%s', 'now')
`;

/** IPC accepts only the two explicit flag values; never coerce arbitrary input. */
export function normalizeWatchedFlag(value: unknown): 0 | 1 | null {
  if (value === 0 || value === 1) return value;
  return null;
}
