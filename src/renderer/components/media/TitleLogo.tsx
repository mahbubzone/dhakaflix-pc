/**
 * Title logo with a text fallback.
 *
 * Cinemeta logos are often navy or black, so the image is tinted white with
 * a CSS filter. If it fails to load, the library title is shown instead.
 */

import React, { useEffect, useState } from 'react';
import './TitleLogo.css';

interface TitleLogoProps {
  title: string;
  logoUrl?: string | null;
  size?: 'hero' | 'detail';
}

export default function TitleLogo({ title, logoUrl, size = 'hero' }: TitleLogoProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logoUrl]);

  if (logoUrl && !failed) {
    return (
      <img
        className={`title-logo title-logo--image title-logo--${size}`}
        src={logoUrl}
        alt={title}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <h1 className={`title-logo title-logo--text title-logo--${size}`} title={title}>
      {title}
    </h1>
  );
}
