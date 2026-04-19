import { apiFetch } from "./api";

let navigationCache = null;
let navigationPromise = null;

export const getCatalogNavigation = async () => {
  if (navigationCache) {
    return navigationCache;
  }

  if (!navigationPromise) {
    navigationPromise = apiFetch("/products/navigation")
      .then((response) => {
        navigationCache = response;
        return response;
      })
      .catch((error) => {
        navigationPromise = null;
        throw error;
      });
  }

  return navigationPromise;
};
