/**
 * Shared inline icon set.
 *
 * Lucide-style outline geometry on a 24x24 grid. No icon package: one family,
 * one wrapper, and CSS-owned stroke. Decorative by default; the parent control
 * supplies the accessible name.
 */

import type { CSSProperties, ReactNode } from 'react';

export type IconName =
  | 'house'
  | 'clapperboard'
  | 'tv'
  | 'file-video'
  | 'trophy'
  | 'bookmark'
  | 'search'
  | 'settings'
  | 'play'
  | 'circle-play'
  | 'pause'
  | 'star'
  | 'info'
  | 'ellipsis'
  | 'heart'
  | 'bookmark-plus'
  | 'bookmark-minus'
  | 'circle-check'
  | 'arrow-left'
  | 'arrow-right'
  | 'x'
  | 'skip-forward'
  | 'skip-back'
  | 'volume-2'
  | 'captions'
  | 'audio-lines'
  | 'maximize'
  | 'minimize'
  | 'list-filter'
  | 'arrow-up-down'
  | 'refresh-cw'
  | 'loader-circle';

export interface IconProps {
  name: IconName;
  className?: string;
  style?: CSSProperties;
}

const PATHS: Record<IconName, ReactNode> = {
  house: (
    <>
      <path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
    </>
  ),
  clapperboard: (
    <>
      <path d="M3 9.5h18v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5z" />
      <path d="M3 9.5 4.5 4h15L21 9.5z" />
      <path d="m8 4 1.5 5.5M13 4l1.5 5.5M17.5 4 19 9.5" />
    </>
  ),
  tv: (
    <>
      <rect x="2" y="7" width="20" height="15" rx="2" />
      <path d="m7 3 5 4 5-4" />
    </>
  ),
  'file-video': (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
      <path d="m10 12 5 3-5 3z" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 3h10v6a5 5 0 0 1-10 0z" />
      <path d="M7 5H5a2 2 0 0 0 0 4h2M17 5h2a2 2 0 0 1 0 4h-2" />
      <path d="M12 14v4M8 21h8M9 18h6" />
    </>
  ),
  bookmark: (
    <>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  play: (
    <>
      <path d="M6 3 20 12 6 21z" />
    </>
  ),
  'circle-play': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m10 8 6 4-6 4z" />
    </>
  ),
  pause: (
    <>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </>
  ),
  star: (
    <>
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  ellipsis: (
    <>
      <circle cx="5" cy="12" r="1.25" />
      <circle cx="12" cy="12" r="1.25" />
      <circle cx="19" cy="12" r="1.25" />
    </>
  ),
  heart: (
    <>
      <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </>
  ),
  'bookmark-plus': (
    <>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
      <path d="M12 8v6M9 11h6" />
    </>
  ),
  'bookmark-minus': (
    <>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
      <path d="M9 11h6" />
    </>
  ),
  'circle-check': (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18M6 6l12 12" />
    </>
  ),
  'skip-forward': (
    <>
      <path d="M5 4 15 12 5 20z" />
      <path d="M19 5v14" />
    </>
  ),
  'skip-back': (
    <>
      <path d="M19 4 9 12l10 8z" />
      <path d="M5 5v14" />
    </>
  ),
  'volume-2': (
    <>
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </>
  ),
  captions: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M10.5 10.5a2.5 2.5 0 1 0 0 3M17 10.5a2.5 2.5 0 1 0 0 3" />
    </>
  ),
  'audio-lines': (
    <>
      <path d="M3 10v4M7 6v12M11 3v18M15 6v12M19 10v4" />
    </>
  ),
  maximize: (
    <>
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" />
    </>
  ),
  minimize: (
    <>
      <path d="M3 8h3a2 2 0 0 0 2-2V3M21 8h-3a2 2 0 0 1-2-2V3M16 21v-3a2 2 0 0 1 2-2h3M8 21v-3a2 2 0 0 0-2-2H3" />
    </>
  ),
  'list-filter': (
    <>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </>
  ),
  'arrow-up-down': (
    <>
      <path d="M7 21V3M3 7l4-4 4 4M17 3v18M13 17l4 4 4-4" />
    </>
  ),
  'refresh-cw': (
    <>
      <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" />
      <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5" />
    </>
  ),
  'loader-circle': (
    <>
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </>
  ),
};

export default function Icon({ name, className, style }: IconProps) {
  return (
    <svg
      className={className ? `icon ${className}` : 'icon'}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
