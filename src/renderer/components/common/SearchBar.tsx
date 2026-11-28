/**
 * SearchBar Component
 */

import React, { useRef, useEffect } from 'react';
import Icon from './Icon';
import './SearchBar.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClose?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  onClose,
  placeholder = 'Search movies and series...',
  autoFocus = true,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (value) {
        onChange('');
      } else {
        onClose?.();
      }
    }
  };

  return (
    <div className="search-bar">
      <span className="search-bar__icon">
        <Icon name="search" style={{ fontSize: 'var(--icon-nav)' }} />
      </span>
      
      <input
        ref={inputRef}
        type="text"
        className="search-bar__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />

      {value && (
        <button
          className="search-bar__clear"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <Icon name="x" style={{ fontSize: 'var(--icon-button)' }} />
        </button>
      )}

      <span className="search-bar__shortcut">
        <kbd>Ctrl</kbd>+<kbd>K</kbd>
      </span>
    </div>
  );
}
