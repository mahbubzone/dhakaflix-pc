/**
 * Update Banner
 *
 * Small, dismissible notification shown when an update is detected.
 * Does not block navigation; Settings holds the full update controls.
 */

import React, { useEffect, useState } from 'react';
import './UpdateBanner.css';

interface UpdateBannerProps {
  onOpenSettings: () => void;
}

export default function UpdateBanner({ onOpenSettings }: UpdateBannerProps) {
  const [version, setVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const offAvailable = window.api.update.onAvailable((info) => {
      setVersion(info.version);
      setDismissed(false);
      setReady(false);
      setError(null);
    });
    const offProgress = window.api.update.onProgress(() => {
      setDownloading(true);
    });
    const offReady = window.api.update.onReady(() => {
      setDownloading(false);
      setReady(true);
      setDismissed(false);
    });

    return () => {
      offAvailable();
      offProgress();
      offReady();
    };
  }, []);

  const handleDownload = async () => {
    setError(null);
    setDownloading(true);
    try {
      const result = await window.api.update.download();
      if (!result.ok) {
        setError(result.error);
        setDownloading(false);
      }
    } catch (err) {
      setError((err as Error).message);
      setDownloading(false);
    }
  };

  if (!version || dismissed) return null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <div className="update-banner__message">
        <span className="update-banner__title">
          {ready ? 'Update ready to install' : `Version ${version} available`}
        </span>
        {error && <span className="update-banner__error">{error}</span>}
      </div>
      {!ready && (
        <button
          className="update-banner__download"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? 'Downloading...' : 'Download'}
        </button>
      )}
      <button className="update-banner__settings" onClick={onOpenSettings}>
        Settings
      </button>
      <button
        className="update-banner__dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss update notification"
      >
        ×
      </button>
    </div>
  );
}
