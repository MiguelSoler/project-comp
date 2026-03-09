import { get, post } from "./apiClient.js";

// POST /api/voto-usuario
export function createOrUpdateVote(payload) {
    return post("/api/voto-usuario", payload);
}

// GET /api/voto-usuario/mis-votos
export function listMyVotes({ page = 1, limit = 10, sort = "newest", pisoId } = {}) {
    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("limit", String(limit));
    params.set("sort", sort);

    if (pisoId !== undefined && pisoId !== null && pisoId !== "") {
        params.set("pisoId", String(pisoId));
    }

    return get(`/api/voto-usuario/mis-votos?${params.toString()}`);
}