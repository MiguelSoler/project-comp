import { del, get, patch, post } from "./apiClient.js";

// GET /api/admin/habitacion?page=1&limit=10&q=&ciudad=&precioMin=&precioMax=&tamanoMin=&activo=all|true|false&disponible=all|true|false&amueblada=all|true|false&bano=all|true|false&balcon=all|true|false&sort=
export function listAdminHabitaciones({
  page = 1,
  limit = 10,
  q,
  ciudad,
  precioMin,
  precioMax,
  tamanoMin,
  activo = "all",
  disponible = "all",
  amueblada = "all",
  bano = "all",
  balcon = "all",
  sort = "newest",
} = {}) {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("activo", String(activo));
  params.set("disponible", String(disponible));
  params.set("amueblada", String(amueblada));
  params.set("bano", String(bano));
  params.set("balcon", String(balcon));
  params.set("sort", String(sort));

  if (q) params.set("q", q);
  if (ciudad) params.set("ciudad", ciudad);
  if (precioMin !== undefined && precioMin !== null && precioMin !== "") {
    params.set("precioMin", String(precioMin));
  }
  if (precioMax !== undefined && precioMax !== null && precioMax !== "") {
    params.set("precioMax", String(precioMax));
  }
  if (tamanoMin !== undefined && tamanoMin !== null && tamanoMin !== "") {
    params.set("tamanoMin", String(tamanoMin));
  }

  return get(`/api/admin/habitacion?${params.toString()}`);
}

// GET /api/admin/habitacion/:habitacionId/historial
export function getAdminHabitacionHistorial(habitacionId) {
  return get(`/api/admin/habitacion/${habitacionId}/historial`);
}

// GET /api/admin/habitacion/:habitacionId
export function getAdminHabitacionById(habitacionId) {
  return get(`/api/admin/habitacion/${habitacionId}`);
}

// POST /api/admin/habitacion
export function createAdminHabitacion(payload) {
  return post("/api/admin/habitacion", payload);
}

// PATCH /api/admin/habitacion/:habitacionId
export function updateAdminHabitacion(habitacionId, payload) {
  return patch(`/api/admin/habitacion/${habitacionId}`, payload);
}

// DELETE /api/admin/habitacion/:habitacionId/deactivate
export function deactivateAdminHabitacion(habitacionId) {
  return del(`/api/admin/habitacion/${habitacionId}/deactivate`);
}

// PATCH /api/admin/habitacion/:habitacionId/reactivate
export function reactivateAdminHabitacion(habitacionId) {
  return patch(`/api/admin/habitacion/${habitacionId}/reactivate`, {});
}

// POST /api/admin/habitacion/:habitacionId/fotos
export function addAdminHabitacionFoto(habitacionId, payload) {
  return post(`/api/admin/habitacion/${habitacionId}/fotos`, payload);
}

// PATCH /api/admin/habitacion/:habitacionId/fotos/:fotoId
export function updateAdminHabitacionFoto(habitacionId, fotoId, payload) {
  return patch(`/api/admin/habitacion/${habitacionId}/fotos/${fotoId}`, payload);
}

// DELETE /api/admin/habitacion/:habitacionId/fotos/:fotoId
export function deleteAdminHabitacionFoto(habitacionId, fotoId) {
  return del(`/api/admin/habitacion/${habitacionId}/fotos/${fotoId}`);
}