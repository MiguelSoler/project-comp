import { get, patch, post } from "./apiClient.js";

// GET /api/usuario-habitacion/search-user?habitacionId=&email=
export function searchAssignableUserByEmail({ habitacionId, email }) {
  const params = new URLSearchParams();

  params.set("habitacionId", String(habitacionId));
  params.set("email", String(email || "").trim());

  return get(`/api/usuario-habitacion/search-user?${params.toString()}`);
}

// POST /api/usuario-habitacion/join
export function joinHabitacion(payload) {
  return post("/api/usuario-habitacion/join", payload);
}

// PATCH /api/usuario-habitacion/leave
export function leaveHabitacion(payload) {
  return patch("/api/usuario-habitacion/leave", payload);
}

// PATCH /api/usuario-habitacion/kick/:usuarioHabitacionId
export function kickFromHabitacion(usuarioHabitacionId, payload) {
  return patch(`/api/usuario-habitacion/kick/${usuarioHabitacionId}`, payload);
}

// GET /api/usuario-habitacion/my
export function getMyRoomStay() {
  return get("/api/usuario-habitacion/my");
}

// GET /api/usuario-habitacion/piso/:pisoId/convivientes
export function listConvivientesByPiso(pisoId) {
  return get(`/api/usuario-habitacion/piso/${pisoId}/convivientes`);
}