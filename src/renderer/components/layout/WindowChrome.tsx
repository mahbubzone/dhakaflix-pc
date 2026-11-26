/**
 * Thin window chrome strip.
 *
 * Sits above the top navigation as its own 20px band, so the window controls
 * never read as navigation items. The strip doubles as a drag surface.
 */

import React from 'react';
import WindowControls from './WindowControls';
import './WindowControls.css';

export default function WindowChrome() {
  return (
    <div
      className="window-chrome"
      onDoubleClick={() => window.api.window.maximize()}
    >
      <WindowControls />
    </div>
  );
}
