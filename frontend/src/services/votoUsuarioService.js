import { get } from "./apiClient.js";

// GET /api/voto-usuario/usuario/:usuarioId/resumen
export function getUserVotesSummary(usuarioId) {
    return get(`/api/voto-usuario/usuario/${usuarioId}/resumen`);
}

// GET /api/voto-usuario/usuario/:usuarioId/recibidos
export function listReceivedVotes(usuarioId) {
    return get(`/api/voto-usuario/usuario/${usuarioId}/recibidos`);
}