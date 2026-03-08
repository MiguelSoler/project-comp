const TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_STORAGE_KEY || "pc_token";
const USER_KEY = import.meta.env.VITE_AUTH_USER_STORAGE_KEY || "pc_user";


function notifyAuthChanged() {
    // Notifica a la app (mismo tab) que ha cambiado el auth en localStorage
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("pc_auth_changed"));
    }
}

export function setToken(token) {
    if (typeof token !== "string" || token.trim() === "") return;
    localStorage.setItem(TOKEN_KEY, token);
    notifyAuthChanged();
}

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    notifyAuthChanged();
}

export function setUser(user) {
    if (!user) return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    notifyAuthChanged();
}

export function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function clearUser() {
    localStorage.removeItem(USER_KEY);
    notifyAuthChanged();
}

export function clearAuthStorage() {
    // Ojo: esto llamará notify 2 veces (por clearToken/clearUser). Es OK.
    clearToken();
    clearUser();
}