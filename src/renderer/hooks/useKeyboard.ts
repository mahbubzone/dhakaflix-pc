/**
 * useKeyboard Hook
 * 
 * Global keyboard shortcuts.
 */

import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface KeyboardShortcuts {
  [key: string]: KeyHandler;
}

/**
 * Register global keyboard shortcuts
 */
export function useKeyboard(shortcuts: KeyboardShortcuts): void {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Build key string: Ctrl+Shift+K format
    const parts: string[] = [];
    if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    
    // Add the key itself
    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
    parts.push(key);
    
    const combo = parts.join('+');
    
    // Check for matching shortcut
    const handler = shortcuts[combo] || shortcuts[event.key];
    if (handler) {
      event.preventDefault();
      handler(event);
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Common shortcuts for media app
 */
export function useAppShortcuts(handlers: {
  onSearch?: () => void;
  onSettings?: () => void;
  onBack?: () => void;
  onHome?: () => void;
}) {
  useKeyboard({
    'Ctrl+K': () => handlers.onSearch?.(),
    'Ctrl+F': () => handlers.onSearch?.(),
    'Ctrl+,': () => handlers.onSettings?.(),
    'Escape': () => handlers.onBack?.(),
    'Backspace': () => handlers.onBack?.(),
    'Home': () => handlers.onHome?.(),
  });
}
