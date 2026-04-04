import { apiFetch, del, get, post, patch } from "./apiClient.js";

// GET /api/usuario/me
export function getMyProfile() {
  return get("/api/usuario/me");
}

// PATCH /api/usuario/me
export function updateMyProfile(payload) {
  return patch("/api/usuario/me", payload);
}

// PATCH /api/usuario/me/foto
export function updateMyProfileFoto(formData) {
  return apiFetch("/api/usuario/me/foto", {
    method: "PATCH",
    body: formData,
  });
}

// DELETE /api/usuario/me/foto
export function deleteMyProfileFoto() {
  return apiFetch("/api/usuario/me/foto", {
    method: "DELETE",
  });
}

// PATCH /api/usuario/me/password
export function updateMyPassword(payload) {
  return patch("/api/usuario/me/password", payload);
}

// GET /api/usuario/me/estancia
export function getMyStay() {
  return get("/api/usuario/me/estancia");
}

// DELETE /api/usuario/me
export function deleteMyAccount() {
  return del("/api/usuario/me");
}

// POST /api/usuario/convertirse-anunciante
export function convertirmeEnAdvertiser(payload) {
  return post("/api/usuario/convertirse-anunciante", payload);
}

// POST /api/usuario/dejar-de-ser-anunciante
export function dejarDeSerAdvertiser() {
  return post("/api/usuario/dejar-de-ser-anunciante", {});
}