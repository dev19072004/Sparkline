import { apiFetch } from "./api";

let navigationCache = null;
let navigationPromise = null;
let navigationCacheTimestamp = 0;

const NAVIGATION_CACHE_TTL_MS = 5000;

export const clearCatalogNavigationCache = () => {
  navigationCache = null;
  navigationPromise = null;
  navigationCacheTimestamp = 0;
};

export const getCatalogNavigation = async ({ forceRefresh = false } = {}) => {
  const isCacheFresh =
    navigationCache &&
    Date.now() - navigationCacheTimestamp < NAVIGATION_CACHE_TTL_MS;

  if (!forceRefresh && isCacheFresh) {
    return navigationCache;
  }

  if (navigationPromise) {
    return navigationPromise;
  }

  navigationPromise = apiFetch("/products/navigation", { cache: "no-store" })
    .then((response) => {
      navigationCache = response;
      navigationCacheTimestamp = Date.now();
      return response;
    })
    .finally(() => {
      navigationPromise = null;
    });

  return navigationPromise;
};
