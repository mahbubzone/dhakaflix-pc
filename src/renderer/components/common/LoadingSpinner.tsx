/**
 * LoadingSpinner Component
 */

import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  label?: string;
}

export default function LoadingSpinner({ size = 'medium', label }: LoadingSpinnerProps) {
  return (
    <div className={`loading-spinner loading-spinner--${size}`}>
      <div className="loading-spinner__circle" />
      {label && <span className="loading-spinner__label">{label}</span>}
    </div>
  );
}
