import { get } from "./apiClient.js";

// GET /api/habitacion?page=1&limit=10&ciudad=&precioMax=&disponible=&bano=&balcon=&amueblada=&tamanoMin=&tamanoMax=&q=&sort=
export function listHabitaciones({
  page = 1,
  limit = 10,
  ciudad,
  precioMax,
  disponible,
  bano,
  balcon,
  amueblada,
  tamanoMin,
  tamanoMax,
  q,
  sort,
} = {}) {
  const params = new URLSearchParams();

  params.set("page", String(page));
  params.set("limit", String(limit));

  if (ciudad) params.set("ciudad", ciudad);
  if (precioMax !== undefined && precioMax !== null && precioMax !== "") {
    params.set("precioMax", String(precioMax));
  }
  if (disponible !== undefined && disponible !== null && disponible !== "") {
    params.set("disponible", String(disponible));
  }
  if (bano !== undefined && bano !== null && bano !== "") {
    params.set("bano", String(bano));
  }
  if (balcon !== undefined && balcon !== null && balcon !== "") {
    params.set("balcon", String(balcon));
  }
  if (amueblada !== undefined && amueblada !== null && amueblada !== "") {
    params.set("amueblada", String(amueblada));
  }
  if (tamanoMin !== undefined && tamanoMin !== null && tamanoMin !== "") {
    params.set("tamanoMin", String(tamanoMin));
  }
  if (tamanoMax !== undefined && tamanoMax !== null && tamanoMax !== "") {
    params.set("tamanoMax", String(tamanoMax));
  }
  if (q) params.set("q", q);
  if (sort) params.set("sort", sort);

  return get(`/api/habitacion?${params.toString()}`);
}

// GET /api/habitacion/:habitacionId
export function getHabitacionById(habitacionId) {
  return get(`/api/habitacion/${habitacionId}`);
}