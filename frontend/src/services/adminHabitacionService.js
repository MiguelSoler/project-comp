import { del, get, patch, post } from "./apiClient.js";

// GET /api/admin/habitacion/:habitacionId
export function getAdminHabitacionById(habitacionId) {
  return get(`/api/admin/habitacion/${habitacionId}`);
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