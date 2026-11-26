/**
 * Thin window controls drawn by the app, always visible in the top nav.
 *
 * The window is frameless, so these buttons replace the native caption
 * buttons. Icons are hairline strokes at 1.1px so they read as part of the
 * interface rather than as Windows chrome.
 */

import React, { useEffect, useState } from 'react';
import './WindowControls.css';

export default function WindowControls() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let active = true;

    window.api.window
      .isMaximized()
      .then((value) => {
        if (active) setMaximized(value);
      })
      .catch(() => {
        // A failed query only means the glyph may start in the wrong state.
      });

    const off = window.api.window.onMaximizeChange(setMaximized);

    return () => {
      active = false;
      off();
    };
  }, []);

  return (
    <div className="window-controls" role="group" aria-label="Window controls">
      <button
        className="window-controls__button"
        type="button"
        aria-label="Minimize"
        title="Minimize"
        onClick={() => window.api.window.minimize()}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3.5 8h9" />
        </svg>
      </button>

      <button
        className="window-controls__button"
        type="button"
        aria-label={maximized ? 'Restore' : 'Maximize'}
        title={maximized ? 'Restore' : 'Maximize'}
        onClick={() => window.api.window.maximize()}
      >
        {maximized ? (
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M5.6 5.6V4.1h6.3v6.3H10.4" />
            <rect x="3.6" y="6.4" width="6" height="6" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect x="3.75" y="3.75" width="8.5" height="8.5" />
          </svg>
        )}
      </button>

      <button
        className="window-controls__button window-controls__button--close"
        type="button"
        aria-label="Close"
        title="Close"
        onClick={() => window.api.window.close()}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}
