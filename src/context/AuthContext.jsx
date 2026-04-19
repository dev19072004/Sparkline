import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  apiFetch,
  clearStoredAuthToken,
  getStoredAuthToken,
  setStoredAuthToken
} from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = getStoredAuthToken();

      if (!token) {
        setIsReady(true);
        return;
      }

      try {
        const response = await apiFetch("/auth/me");
        setUser(response.user);
      } catch {
        clearStoredAuthToken();
        setUser(null);
      } finally {
        setIsReady(true);
      }
    };

    bootstrapAuth();
  }, []);

  const applyAuthResponse = (response) => {
    setStoredAuthToken(response.token);
    setUser(response.user);
  };

  const value = useMemo(
    () => ({
      user,
      isReady,
      login: async (payload) => {
        const response = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        applyAuthResponse(response);
        return response;
      },
      signup: async (payload) => {
        const response = await apiFetch("/auth/signup", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        applyAuthResponse(response);
        return response;
      },
      logout: async () => {
        try {
          await apiFetch("/auth/logout", { method: "POST" });
        } catch {
          // Clearing local auth state keeps the UI consistent even if the request fails.
        } finally {
          clearStoredAuthToken();
          setUser(null);
        }
      },
      forgotPassword: async (payload) =>
        apiFetch("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify(payload)
        }),
      verifyResetOtp: async (payload) =>
        apiFetch("/auth/verify-reset-otp", {
          method: "POST",
          body: JSON.stringify(payload)
        }),
      resetPassword: async (payload) =>
        apiFetch("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify(payload)
        })
    }),
    [isReady, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
