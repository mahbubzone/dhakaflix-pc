/**
 * Catalog filter bar.
 *
 * Emits a CatalogFilters object; the parent owns filtering and result counts.
 * The genre select only appears when real cached metadata supplies genres.
 */

import React from 'react';
import {
  catalogFilterCount,
  DEFAULT_CATALOG_FILTERS,
  RATING_FILTERS,
  YEAR_FILTERS,
  type AudioFilter,
  type CatalogFilters,
  type QualityFilter,
  type RatingFilter,
  type SortFilter,
} from '../../utils/filters';
import './FilterBar.css';

interface FilterBarProps {
  filters: CatalogFilters;
  onChange: (filters: CatalogFilters) => void;
  genres?: string[];
  /** Every real year in the loaded titles, descending. */
  years?: number[];
  count: number;
  /** Search keeps the bar mounted but inert until results exist. */
  disabled?: boolean;
}

export default function FilterBar({
  filters,
  onChange,
  genres = [],
  years = [],
  count,
  disabled = false,
}: FilterBarProps) {
  const update = <K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const activeCount = catalogFilterCount(filters);
  const chips: { key: keyof CatalogFilters; label: string }[] = [];
  if (filters.genre) chips.push({ key: 'genre', label: `Genre: ${filters.genre}` });
  if (filters.year !== 'any') {
    chips.push({ key: 'year', label: `Year: ${YEAR_FILTERS.find((item) => item.id === filters.year)?.label ?? filters.year}` });
  }
  if (filters.rating !== 'all') {
    chips.push({ key: 'rating', label: `Rating: ${RATING_FILTERS.find((item) => item.id === filters.rating)?.label ?? filters.rating}` });
  }
  if (filters.quality !== 'any') chips.push({ key: 'quality', label: `Quality: ${filters.quality}` });
  if (filters.audio === 'dual') chips.push({ key: 'audio', label: 'Audio: Dual Audio' });

  const removeChip = (key: keyof CatalogFilters) => {
    onChange({ ...filters, [key]: DEFAULT_CATALOG_FILTERS[key] });
  };

  return (
    <div
      className={`filterbar${disabled ? ' filterbar--disabled' : ''}`}
      role="group"
      aria-label="Filter titles"
      aria-disabled={disabled}
    >
      <span className="filterbar__label">Filters</span>

      <select
        aria-label="Rating"
        value={filters.rating}
        disabled={disabled}
        onChange={(event) => update('rating', event.target.value as RatingFilter)}
      >
        {RATING_FILTERS.map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>

      {genres.length > 0 && (
        <select
          aria-label="Genre"
          value={filters.genre}
          disabled={disabled}
          onChange={(event) => update('genre', event.target.value)}
        >
          <option value="">All genres</option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
      )}

      <select
        aria-label="Year"
        disabled={disabled}
        value={filters.year}
        onChange={(event) => update('year', event.target.value as CatalogFilters['year'])}
      >
        <option value="any">All years</option>
        {years.map((year) => (
          <option key={year} value={String(year)}>{year}</option>
        ))}
      </select>

      <select
        aria-label="Quality"
        value={filters.quality}
        disabled={disabled}
        onChange={(event) => update('quality', event.target.value as QualityFilter)}
      >
        <option value="any">Any quality</option>
        <option value="1080p">1080p</option>
        <option value="720p">720p</option>
      </select>

      <select
        aria-label="Audio"
        value={filters.audio}
        disabled={disabled}
        onChange={(event) => update('audio', event.target.value as AudioFilter)}
      >
        <option value="any">Any audio</option>
        <option value="dual">Dual Audio</option>
      </select>

      <select
        aria-label="Sort"
        value={filters.sort}
        disabled={disabled}
        onChange={(event) => update('sort', event.target.value as SortFilter)}
      >
        <option value="added">Recently added</option>
        <option value="rating">Highest rated</option>
        <option value="newest">Newest year</option>
        <option value="title">A–Z</option>
      </select>

      <div className="filterbar__spacer" />

      {chips.length > 0 && (
        <div className="filterbar__applied">
          {chips.map((chip) => (
            <button
              key={chip.key}
              disabled={disabled}
              onClick={() => removeChip(chip.key)}
              aria-label={`Remove ${chip.label} filter`}
            >
              {chip.label} ×
            </button>
          ))}
        </div>
      )}

      <span className="filterbar__count">{count} titles</span>

      {activeCount > 0 && (
        <button
          className="filterbar__clear"
          disabled={disabled}
          onClick={() => onChange({ ...DEFAULT_CATALOG_FILTERS, sort: filters.sort })}
        >
          Clear
        </button>
      )}
    </div>
  );
}
