/**
 * Per-view catalogue filters that survive navigation and restarts.
 */

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_CATALOG_FILTERS, type CatalogFilters } from '../utils/filters';
import { getFilters, saveFilters } from '../utils/uiState';

export function usePersistedFilters(key: string): [CatalogFilters, (next: CatalogFilters) => void] {
  const [filters, setFilters] = useState<CatalogFilters>(
    () => getFilters(key) ?? DEFAULT_CATALOG_FILTERS
  );

  // Switching category swaps the bucket without remounting the view.
  useEffect(() => {
    setFilters(getFilters(key) ?? DEFAULT_CATALOG_FILTERS);
  }, [key]);

  const update = useCallback((next: CatalogFilters) => {
    setFilters(next);
    saveFilters(key, next);
  }, [key]);

  return [filters, update];
}
