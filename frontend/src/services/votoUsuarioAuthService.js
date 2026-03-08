import { get, post } from "./apiClient.js";

// POST /api/votoUsuarioAuth
export function createOrUpdateVote(payload) {
    return post("/api/votoUsuarioAuth", payload);
}

// GET /api/votoUsuarioAuth/mis-votos
export function listMyVotes() {
    return get("/api/votoUsuarioAuth/mis-votos");
}