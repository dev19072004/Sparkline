export const AUTH_TOKEN_KEY = "sparkline_auth_token";
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:5050/api");

export const getStoredAuthToken = () =>
  typeof window !== "undefined"
    ? window.localStorage.getItem(AUTH_TOKEN_KEY)
    : null;

export const setStoredAuthToken = (token) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
};

export const clearStoredAuthToken = () => {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};

export const apiFetch = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  const hasBody = options.body !== undefined;

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getStoredAuthToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const rawBody = await response.text();
  const looksLikeHtml =
    typeof rawBody === "string" &&
    /^(\s*<!doctype html|\s*<html\b)/i.test(rawBody);
  let payload = null;

  if (rawBody && !looksLikeHtml) {
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = rawBody;
    }
  }

  if (looksLikeHtml) {
    throw new Error("Unexpected server response. Please try again.");
  }

  if (!response.ok) {
    throw new Error(
      payload?.message || (typeof payload === "string" ? payload : "Request failed")
    );
  }

  return payload;
};
