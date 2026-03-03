import { createContext, useEffect, useMemo, useState } from "react";

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

    // Al montar: cargar lo que haya en localStorage
    useEffect(() => {
        setTokenState(getToken());
        setUserState(getUser());
    }, []);

    const isAuthenticated = Boolean(token);

    const login = async (payload) => {
        const data = await authService.login(payload);

        // ✅ Garantía: si el backend devuelve token/user, lo guardamos y actualizamos estado
        if (data?.token) {
            setTokenStorage(data.token);
            setTokenState(data.token);
        }
        if (data?.user) {
            setUserStorage(data.user);
            setUserState(data.user);
        }

        return data;
    };

    const register = async (payload) => {
        const data = await authService.register(payload);

        if (data?.token) {
            setTokenStorage(data.token);
            setTokenState(data.token);
        }
        if (data?.user) {
            setUserStorage(data.user);
            setUserState(data.user);
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
            setUser: (nextUser) => {
                setUserStorage(nextUser);
                setUserState(nextUser);
            },
        }),
        [token, user, isAuthenticated]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}