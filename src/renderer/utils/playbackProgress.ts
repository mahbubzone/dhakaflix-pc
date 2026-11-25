/**
 * Playback resume rules.
 *
 * A resume position must come from progress read for the exact href being
 * launched. Episode progress must never be reused for the parent series.
 */

export interface StoredProgress {
  position: number;
  duration: number;
  watched: number;
}

/** Real, unplayed start time for one href, or undefined to start at zero. */
export function resumePositionFor(
  progress: StoredProgress | null | undefined,
  fromBeginning = false
): number | undefined {
  if (fromBeginning || !progress || progress.watched) return undefined;
  const { position, duration } = progress;
  if (!Number.isFinite(position) || !Number.isFinite(duration)) return undefined;
  if (duration <= 0 || position <= 0 || position >= duration) return undefined;
  return position;
}
