import { getToken, clearAuthStorage } from "../utilities/storage.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const FRIENDLY_API_ERROR_MESSAGES = {
    MISSING_OR_INVALID_TOKEN: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
    INVALID_TOKEN: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
    UNAUTHORIZED: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
    FORBIDDEN: "No tienes permisos para realizar esta acción.",
    FORBIDDEN_NOT_OWNER: "No tienes permisos para modificar este recurso.",
    HTTP_ERROR: "No se pudo completar la solicitud.",
    INTERNAL_ERROR: "Ha ocurrido un error interno. Inténtalo de nuevo más tarde.",
    INVALID_SERVER_CONFIG: "El servicio no está disponible ahora mismo.",
    VALIDATION_ERROR: "Revisa los datos del formulario.",
    USER_NOT_FOUND: "No se encontró el usuario.",
    USER_INACTIVE: "Este usuario está inactivo.",
    DUPLICATE_EMAIL: "Ese email ya está en uso.",
    NO_FIELDS_TO_UPDATE: "No hay cambios para guardar.",
    PISO_HAS_ACTIVE_OCCUPANTS: "No se puede desactivar porque tiene ocupantes activos.",
    ROOM_OCCUPIED: "No se puede desactivar porque la habitación está ocupada.",
    ORDER_CONFLICT: "Ese orden ya está asignado a otra foto.",
};

function isTechnicalMessage(message) {
    if (typeof message !== "string") return true;
    const trimmed = message.trim();
    if (!trimmed) return true;
    if (/^[A-Z0-9_]+$/.test(trimmed)) return true;
    return ["Unauthorized", "Forbidden", "Not Found", "Internal Server Error", "Request failed"].includes(trimmed);
}

export function getApiErrorMessage(error, fallback = "No se pudo completar la operación.") {
    const code = error?.error || error?.message;

    if (error?.status === 401 && (!code || code === "HTTP_ERROR")) {
        return FRIENDLY_API_ERROR_MESSAGES.UNAUTHORIZED;
    }

    if (FRIENDLY_API_ERROR_MESSAGES[code]) {
        return FRIENDLY_API_ERROR_MESSAGES[code];
    }

    if (!isTechnicalMessage(error?.message)) {
        return error.message;
    }

    if (error?.status === 401) return FRIENDLY_API_ERROR_MESSAGES.UNAUTHORIZED;
    if (error?.status === 403) return FRIENDLY_API_ERROR_MESSAGES.FORBIDDEN;
    if (error?.status === 404) return "No se encontró la información solicitada.";
    if (error?.status === 409) return "No se pudo completar la acción porque hay un conflicto con el estado actual.";
    if (error?.status >= 500) return FRIENDLY_API_ERROR_MESSAGES.INTERNAL_ERROR;

    return fallback;
}

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
        const errorCode = data?.error || (res.status === 401 ? "UNAUTHORIZED" : "HTTP_ERROR");

        // Si el backend devuelve el formato estándar { error, message?, details? }
        const normalized = {
            status: res.status,
            error: errorCode,
            message: getApiErrorMessage(
                { status: res.status, error: errorCode, message: data?.message || res.statusText },
                "No se pudo completar la solicitud."
            ),
            details: Array.isArray(data?.details) ? data.details : [],
        };

        const authErrors = new Set([
            "MISSING_OR_INVALID_TOKEN",
            "INVALID_TOKEN",
            "UNAUTHORIZED",
        ]);

        // Si es 401 por sesión/token, limpiamos auth local (token caducado / inválido)
        if (res.status === 401 && authErrors.has(normalized.error)) {
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
