import { post } from "./apiClient.js";
import { setToken, setUser, clearAuthStorage } from "../utilities/storage.js";

/**
 * backend devuelve:
 * { token, user }  (user ya “sanitizado”)  
 */

export async function register(payload) {
    // payload típico: { nombre, apellidos, email, password, telefono, rol }
    const data = await post("/api/auth/register", payload);

    if (data?.token) setToken(data.token);
    if (data?.user) setUser(data.user);

    return data;
}

export async function login(payload) {
    // payload típico: { email, password }
    const data = await post("/api/auth/login", payload);

    if (data?.token) setToken(data.token);
    if (data?.user) setUser(data.user);

    return data;
}

export function logout() {
    clearAuthStorage();
}