import { getToken, clearAuthStorage } from "../utilities/storage.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * API client basado en fetch.
 * - Añade Authorization automáticamente si hay token
 * - Serializa body JSON
 * - Devuelve JSON (o null si no hay body)
 * - Normaliza errores con { status, error, message, details }
 */
export async function apiFetch(path, options = {}) {
    const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

    const token = getToken();

    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");

    // Si mandamos body y no se ha definido Content-Type, lo ponemos a JSON.
    const hasBody = options.body !== undefined && options.body !== null;
    if (hasBody && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(url, {
        ...options,
        headers,
    });

    // Intenta parsear JSON si existe body
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok) {
        // Si el backend devuelve el formato estándar { error, message?, details? }
        const normalized = {
            status: res.status,
            error: data?.error || "HTTP_ERROR",
            message: data?.message || res.statusText || "Request failed",
            details: Array.isArray(data?.details) ? data.details : [],
        };

        // Si es 401, limpiamos auth local (token caducado / inválido)
        if (res.status === 401) {
            clearAuthStorage();
        }

        throw normalized;
    }

    return data;
}

/* Helpers por método */
export function get(path, options) {
    return apiFetch(path, { ...options, method: "GET" });
}

export function post(path, body, options) {
    const payload = body instanceof FormData ? body : JSON.stringify(body ?? {});
    return apiFetch(path, { ...options, method: "POST", body: payload });
}

export function patch(path, body, options) {
    const payload = body instanceof FormData ? body : JSON.stringify(body ?? {});
    return apiFetch(path, { ...options, method: "PATCH", body: payload });
}

export function del(path, options) {
    return apiFetch(path, { ...options, method: "DELETE" });
}