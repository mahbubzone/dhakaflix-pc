/**
 * Custom Window Title Bar
 * 
 * Frameless window controls with drag region.
 */

import React, { useState, useEffect } from 'react';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Get initial state
    window.api.window.isMaximized().then(setIsMaximized);

    // Listen for changes
    const cleanup = window.api.window.onMaximizeChange(setIsMaximized);
    return cleanup;
  }, []);

  return (
    <header className="title-bar">
      <div className="title-bar-drag" />

      <div className="title-bar-controls">
        <button
          className="title-bar-button"
          onClick={() => window.api.window.minimize()}
          aria-label="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1">
            <path d="M0 0h10v1H0z" fill="currentColor" />
          </svg>
        </button>

        <button
          className="title-bar-button"
          onClick={() => window.api.window.maximize()}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                d="M2 0v2H0v8h8V8h2V0H2zm6 8H2V4h6v4z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                d="M0 0v10h10V0H0zm9 9H1V1h8v8z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>

        <button
          className="title-bar-button title-bar-close"
          onClick={() => window.api.window.close()}
          aria-label="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path
              d="M1 0L0 1l4 4-4 4 1 1 4-4 4 4 1-1-4-4 4-4-1-1-4 4-4-4z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
