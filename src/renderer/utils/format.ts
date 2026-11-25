/**
 * Time formatting shared by resume controls and Continue Watching.
 *
 * Inputs are real seconds from saved progress. Missing or invalid values are
 * never turned into a fake duration.
 */

/** Whole minutes, never below one when a positive duration remains. */
export function formatRemaining(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '0 min';
  if (seconds < 3600) return `${Math.max(1, Math.ceil(seconds / 60))} min`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** Resume/played time, or an empty string when the position is unknown. */
export function formatPosition(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '';
  return formatRemaining(seconds);
}

/** Clamp a real position/duration pair to a displayable 0–100 percentage. */
export function progressPercent(position: number, duration: number): number {
  if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(100, Math.max(0, (position / duration) * 100));
}
