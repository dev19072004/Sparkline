import { useCallback, useEffect, useState } from "react";

import { getCatalogNavigation } from "../lib/navigation";

const DEFAULT_REFRESH_INTERVAL_MS = 15000;

function useCatalogNavigation({
  refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS
} = {}) {
  const [navigation, setNavigation] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNavigation = useCallback(async ({ forceRefresh = false, isBackground = false } = {}) => {
    if (!isBackground) {
      setIsLoading(true);
    }

    try {
      const data = await getCatalogNavigation({ forceRefresh });
      setNavigation(data);
      setError("");
      return data;
    } catch (loadError) {
      console.error("Unable to load product navigation", loadError.message);
      setError(loadError.message);
      return [];
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadNavigation({ forceRefresh: true });
  }, [loadNavigation]);

  useEffect(() => {
    const refreshNavigation = () => {
      loadNavigation({ forceRefresh: true, isBackground: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshNavigation();
      }
    };

    window.addEventListener("focus", refreshNavigation);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshNavigation);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadNavigation]);

  useEffect(() => {
    if (!refreshIntervalMs) {
      return undefined;
    }

    const refreshTimerId = window.setInterval(() => {
      loadNavigation({ forceRefresh: true, isBackground: true });
    }, refreshIntervalMs);

    return () => window.clearInterval(refreshTimerId);
  }, [loadNavigation, refreshIntervalMs]);

  return {
    navigation,
    isLoading,
    error,
    refreshNavigation: () => loadNavigation({ forceRefresh: true })
  };
}

export default useCatalogNavigation;
