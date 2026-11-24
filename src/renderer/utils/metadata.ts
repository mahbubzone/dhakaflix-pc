/**
 * Formatting helpers for cached Cinemeta metadata.
 *
 * Never invent values: callers only display rating/runtime/plot/genres when a
 * real cache row is present.
 */

import type { Metadata } from '../types';

/** A cached miss (imdb_id = '') carries no displayable fields. */
export function isMetadataUsable(
  metadata: Metadata | null | undefined
): metadata is Metadata {
  return Boolean(metadata && metadata.imdb_id);
}

export function parseGenres(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) return value.filter((genre) => typeof genre === 'string');
  if (!value) return [];

  const text = value.trim();
  if (!text) return [];
  if (text.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.filter((genre): genre is string => typeof genre === 'string');
      }
    } catch {
      // Fall through: a plain string is still useful.
    }
  }
  return [text];
}

export function formatGenres(value: string | string[] | null | undefined): string {
  return parseGenres(value).join(', ');
}

export function formatRuntime(minutes: number | null | undefined): string {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return '';
  const total = Math.max(1, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  if (hours === 0) return `${remainder}m`;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

export function formatRating(rating: number | null | undefined): string | null {
  return typeof rating === 'number' && Number.isFinite(rating) ? rating.toFixed(1) : null;
}
