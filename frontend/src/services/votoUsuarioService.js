import { get } from "./apiClient.js";

// GET /api/voto-usuario/usuario/:usuarioId/resumen
export function getUserVotesSummary(usuarioId) {
  return get(`/api/voto-usuario/usuario/${usuarioId}/resumen`);
}

// GET /api/voto-usuario/usuario/:usuarioId/recibidos
export function listReceivedVotes(
  usuarioId,
  { page = 1, limit = 10, sort = "newest", pisoId } = {}
) {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("sort", sort);

  if (pisoId !== undefined && pisoId !== null && pisoId !== "") {
    params.set("pisoId", String(pisoId));
  }

  return get(`/api/voto-usuario/usuario/${usuarioId}/recibidos?${params.toString()}`);
}