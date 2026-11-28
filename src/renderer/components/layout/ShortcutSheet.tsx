/**
 * Keyboard shortcut reference, opened with `?`.
 */

import React, { useEffect, useRef } from 'react';
import Icon from '../common/Icon';
import './ShortcutSheet.css';

interface ShortcutSheetProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Ctrl', 'K'], label: 'Open search' },
  { keys: ['Ctrl', 'F'], label: 'Open search' },
  { keys: ['/'], label: 'Open search' },
  { keys: ['Ctrl', ','], label: 'Open settings' },
  { keys: ['Home'], label: 'Go to Home' },
  { keys: ['Esc'], label: 'Close overlay or go back' },
  { keys: ['Backspace'], label: 'Go back' },
  { keys: ['F11'], label: 'Toggle full screen' },
  { keys: ['?'], label: 'Show this list' },
];

export default function ShortcutSheet({ open, onClose }: ShortcutSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      // Single focusable control: keep focus inside the dialog.
      event.preventDefault();
      closeRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previousFocus.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="shortcuts-overlay dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="shortcuts dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="shortcuts__head">
          <h2 id="shortcuts-title">Keyboard shortcuts</h2>
          <button
            ref={closeRef}
            className="shortcuts__close"
            type="button"
            aria-label="Close shortcuts"
            onClick={onClose}
          >
            <Icon name="x" />
          </button>
        </div>

        <ul className="shortcuts__list">
          {SHORTCUTS.map((item) => (
            <li className="shortcuts__row" key={`${item.keys.join('+')}-${item.label}`}>
              <span className="shortcuts__label">{item.label}</span>
              <span className="shortcuts__keys">
                {item.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
