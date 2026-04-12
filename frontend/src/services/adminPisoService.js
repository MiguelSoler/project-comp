import { del, get, patch, post } from "./apiClient.js";

// GET /api/admin/piso?page=1&limit=10&activo=all|true|false&ciudad=&sort=
export function listAdminPisos({
  page = 1,
  limit = 10,
  ciudad,
  direccion,
  codigo_postal,
  descripcion,
  activo = "all",
  sort = "newest",
} = {}) {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("activo", String(activo));
  params.set("sort", String(sort));

  if (ciudad) {
    params.set("ciudad", ciudad);
  }

  if (direccion) {
    params.set("direccion", direccion);
  }

  if (codigo_postal) {
    params.set("codigo_postal", codigo_postal);
  }

  if (descripcion) {
    params.set("descripcion", descripcion);
  }

  return get(`/api/admin/piso?${params.toString()}`);
}

// GET /api/admin/piso/:pisoId
export function getAdminPisoById(pisoId) {
  return get(`/api/admin/piso/${pisoId}`);
}

// GET /api/admin/piso/:pisoId/convivencia-actual
export function getAdminPisoConvivenciaActual(pisoId) {
  return get(`/api/admin/piso/${pisoId}/convivencia-actual`);
}

// POST /api/admin/piso
export function createAdminPiso(payload) {
  return post("/api/admin/piso", payload);
}

// DELETE /api/admin/piso/:pisoId
export function deactivateAdminPiso(pisoId) {
  return del(`/api/admin/piso/${pisoId}`);
}

// PATCH /api/admin/piso/:pisoId  { activo: true }
export function reactivateAdminPiso(pisoId) {
  return patch(`/api/admin/piso/${pisoId}`, { activo: true });
}

// PATCH /api/admin/piso/:pisoId
export function updateAdminPiso(pisoId, payload) {
  return patch(`/api/admin/piso/${pisoId}`, payload);
}

// GET /api/admin/piso/:pisoId/habitaciones?page=1&limit=20&activo=all|true|false&disponible=all|true|false&sort=
export function listAdminHabitacionesByPiso(
  pisoId,
  {
    page = 1,
    limit = 20,
    activo = "all",
    disponible = "all",
    sort = "newest",
  } = {}
) {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("activo", String(activo));
  params.set("disponible", String(disponible));
  params.set("sort", String(sort));

  return get(`/api/admin/piso/${pisoId}/habitaciones?${params.toString()}`);
}

// POST /api/admin/piso/:pisoId/fotos
export function addAdminPisoFoto(pisoId, payload) {
  return post(`/api/admin/piso/${pisoId}/fotos`, payload);
}

// PATCH /api/admin/piso/:pisoId/fotos/:fotoId
export function updateAdminPisoFoto(pisoId, fotoId, payload) {
  return patch(`/api/admin/piso/${pisoId}/fotos/${fotoId}`, payload);
}

// DELETE /api/admin/piso/:pisoId/fotos/:fotoId
export function deleteAdminPisoFoto(pisoId, fotoId) {
  return del(`/api/admin/piso/${pisoId}/fotos/${fotoId}`);
}