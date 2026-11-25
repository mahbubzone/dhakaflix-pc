/**
 * Trailer embed.
 *
 * Cinemeta trailers are JSON strings. Only a syntactically real YouTube id
 * becomes an iframe, and the frame is mounted only after an explicit click.
 */

import React, { useEffect, useState } from 'react';
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

interface TrailerEmbedProps {
  trailers: string | null | undefined;
  title: string;
  /** Increment from the action bar trailer icon to start playback. */
  playRequest?: number;
}

export default function TrailerEmbed({ trailers, title, playRequest = 0 }: TrailerEmbedProps) {
  const [playing, setPlaying] = useState(false);
  const youtubeId = firstTrailerId(trailers);

  useEffect(() => {
    if (playRequest > 0 && youtubeId) setPlaying(true);
  }, [playRequest, youtubeId]);

  if (!youtubeId) return null;

  return (
    <div className="detail__trailer">
      <h3 className="detail__section-title">Trailer</h3>
      {playing ? (
        <div className="detail__trailer-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`}
            title={`${title} trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <button
          type="button"
          className="detail__trailer-poster"
          onClick={() => setPlaying(true)}
          aria-label={`Play ${title} trailer`}
        >
          <img
            className="detail__trailer-thumb"
            src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            decoding="async"
          />
          <span className="detail__trailer-play" aria-hidden="true">▶</span>
        </button>
      )}
    </div>
  );
}
