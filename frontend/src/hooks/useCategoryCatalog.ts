// @spec F-G2: Shared dependent category catalog hook with graceful parent-only fallback
import { useEffect, useState, useMemo } from 'react';
import {
  categoryCatalogApi,
  type CategoryCatalogItem,
  type CategorySubcategoryItem,
} from '../api/client';

export function useCategoryCatalog(selectedParentCode: string) {
  const [catalog, setCatalog] = useState<CategoryCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setCatalogError(null);
    categoryCatalogApi
      .getCatalog(false)
      .then((items) => {
        if (!cancelled) {
          setCatalog(Array.isArray(items) ? items.filter((c) => c.is_active !== false) : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog([]);
          setCatalogError('Subcategory catalog unavailable; parent category selection remains active.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSubcategories = useMemo<CategorySubcategoryItem[]>(() => {
    const parent = catalog.find((c) => c.code === selectedParentCode);
    if (!parent || !Array.isArray(parent.subcategories)) return [];
    return parent.subcategories.filter((s) => s.is_active !== false);
  }, [catalog, selectedParentCode]);

  return {
    catalog,
    activeSubcategories,
    isLoading,
    catalogError,
  };
}
