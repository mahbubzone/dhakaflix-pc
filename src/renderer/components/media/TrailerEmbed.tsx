/**
 * Trailer parsing helper.
 *
 * Cinemeta trailers are JSON strings. Only a syntactically real YouTube id is
 * ever turned into a player URL. Kept free of CSS imports so unit tests can
 * load it without a bundler.
 */

import type { Trailer } from '../../types';

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** First real YouTube id in stored trailer JSON, or null. */
export function firstTrailerId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  for (const entry of parsed) {
    const id = (entry as Trailer | null)?.youtubeId;
    if (typeof id === 'string' && YOUTUBE_ID.test(id)) return id;
  }
  return null;
}
