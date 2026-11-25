/**
 * Detail View — thin wrapper around the centered DetailModal.
 */

import React from 'react';
import DetailModal from '../components/media/DetailModal';
import type { Movie } from '../types';
import './Detail.css';

interface DetailProps {
  movie: Movie;
  onBack: () => void;
}

export default function Detail({ movie, onBack }: DetailProps) {
  return <DetailModal movie={movie} onClose={onBack} />;
}
