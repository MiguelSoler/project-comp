import { get } from "./apiClient.js";

// GET /api/habitacion?page=1&limit=10
export function listHabitaciones({ page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  return get(`/api/habitacion?${params.toString()}`);
}

// GET /api/habitacion/:habitacionId
export function getHabitacionById(habitacionId) {
  return get(`/api/habitacion/${habitacionId}`);
}