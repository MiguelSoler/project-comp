import { get, patch, post } from "./apiClient.js";

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