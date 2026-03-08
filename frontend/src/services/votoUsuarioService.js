import { get } from "./apiClient.js";

// GET /api/votoUsuario/usuario/:usuarioId/resumen
export function getUserVotesSummary(usuarioId) {
    return get(`/api/votoUsuario/usuario/${usuarioId}/resumen`);
}

// GET /api/votoUsuario/usuario/:usuarioId/recibidos
export function listReceivedVotes(usuarioId) {
    return get(`/api/votoUsuario/usuario/${usuarioId}/recibidos`);
}