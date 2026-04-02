import { createContext, useEffect, useMemo, useState, useCallback } from "react";

import {
  getToken,
  getUser,
  setToken as setTokenStorage,
  setUser as setUserStorage,
  clearAuthStorage,
} from "../utilities/storage.js";

import * as authService from "../services/authService.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUserState] = useState(() => getUser());

  const syncAuthFromStorage = useCallback(() => {
    setTokenState(getToken());
    setUserState(getUser());
  }, []);

  useEffect(() => {
    syncAuthFromStorage();

    window.addEventListener("pc_auth_changed", syncAuthFromStorage);
    window.addEventListener("storage", syncAuthFromStorage);

    return () => {
      window.removeEventListener("pc_auth_changed", syncAuthFromStorage);
      window.removeEventListener("storage", syncAuthFromStorage);
    };
  }, [syncAuthFromStorage]);

  const isAuthenticated = Boolean(token);

  const setSession = useCallback((nextToken, nextUser) => {
    if (nextToken) {
      setTokenStorage(nextToken);
      setTokenState(nextToken);
    }

    if (nextUser) {
      setUserStorage(nextUser);
      setUserState(nextUser);
    }
  }, []);

  const setUser = useCallback((nextUser) => {
    setUserStorage(nextUser);
    setUserState(nextUser);
  }, []);

  const login = async (payload) => {
    const data = await authService.login(payload);

    if (data?.token || data?.user) {
      setSession(data?.token, data?.user);
    }

    return data;
  };

  const register = async (payload) => {
    const data = await authService.register(payload);

    if (data?.token || data?.user) {
      setSession(data?.token, data?.user);
    }

    return data;
  };

  const logout = () => {
    clearAuthStorage();
    setTokenState(null);
    setUserState(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated,
      login,
      register,
      logout,
      setUser,
      setSession,
    }),
    [token, user, isAuthenticated, setUser, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}