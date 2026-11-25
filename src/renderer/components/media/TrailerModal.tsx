/**
 * Trailer lightbox.
 *
 * Mounts the YouTube frame only after the user clicks Watch Trailer. The
 * lightbox sits above the detail modal so the modal keeps its fixed width and
 * layout.
 */

import React, { useEffect, useRef } from 'react';
import './TrailerModal.css';

interface TrailerModalProps {
  youtubeId: string;
  title: string;
  onClose: () => void;
}

export default function TrailerModal({ youtubeId, title, onClose }: TrailerModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  return (
    <div
      className="trailer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} trailer`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="trailer-lightbox">
        <button
          ref={closeRef}
          className="trailer-lightbox__close"
          onClick={onClose}
          aria-label="Close trailer"
        >
          ×
        </button>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
          title={`${title} trailer`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
}
