import { apiFetch } from "./api";
import { catalogNavigationFallback } from "../data/catalogFallback";

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
        console.error("Falling back to bundled catalog navigation:", error.message);
        navigationCache = catalogNavigationFallback;
        navigationPromise = null;
        return navigationCache;
      });
  }

  return navigationPromise;
};
