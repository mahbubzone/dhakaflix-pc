/**
 * Floating window controls.
 *
 * The window is frameless and edge-to-edge, so there is no title bar. These
 * controls stay hidden until the pointer reaches the top-right corner, which
 * keeps the app feeling full screen while staying closable with the mouse.
 */

import React, { useEffect, useState } from 'react';
import './WindowControls.css';

export default function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.api.window.isMaximized().then(setIsMaximized).catch(() => {});
    return window.api.window.onMaximizeChange(setIsMaximized);
  }, []);

  return (
    <>
      <div className="window-drag" aria-hidden="true" />
      <div className="window-chrome" role="group" aria-label="Window controls">
        <button
          className="window-chrome__button"
          onClick={() => window.api.window.minimize()}
          aria-label="Minimize"
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" aria-hidden="true">
            <path d="M0 0h10v1H0z" fill="currentColor" />
          </svg>
        </button>

        <button
          className="window-chrome__button"
          onClick={() => window.api.window.maximize()}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2 0v2H0v8h8V8h2V0H2zm6 8H2V4h6v4z" fill="currentColor" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M0 0v10h10V0H0zm9 9H1V1h8v8z" fill="currentColor" />
            </svg>
          )}
        </button>

        <button
          className="window-chrome__button window-chrome__button--close"
          onClick={() => window.api.window.close()}
          aria-label="Close"
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M1 0L0 1l4 4-4 4 1 1 4-4 4 4 1-1-4-4 4-4-1-1-4 4-4-4z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </>
  );
}
