import { del, get, patch } from "./apiClient.js";

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