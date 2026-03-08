import { get } from "./apiClient.js";

// GET /api/piso?page=1&limit=10&ciudad=&precioMax=&disponible=
export function listPisos({
    page = 1,
    limit = 10,
    ciudad,
    precioMax,
    disponible,
} = {}) {
    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("limit", String(limit));

    if (ciudad) params.set("ciudad", ciudad);
    if (precioMax !== undefined && precioMax !== null && precioMax !== "") {
        params.set("precioMax", String(precioMax));
    }
    if (disponible !== undefined && disponible !== null && disponible !== "") {
        params.set("disponible", String(disponible));
    }

    return get(`/api/piso?${params.toString()}`);
}

// GET /api/piso/ciudad/:ciudad
export function listPisosByCiudad(ciudad) {
    return get(`/api/piso/ciudad/${encodeURIComponent(ciudad)}`);
}

// GET /api/piso/:id
export function getPisoById(pisoId) {
    return get(`/api/piso/${pisoId}`);
}