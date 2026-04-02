import { del, get, post, patch } from "./apiClient.js";

// GET /api/usuario/me
export function getMyProfile() {
    return get("/api/usuario/me");
}

// PATCH /api/usuario/me
export function updateMyProfile(payload) {
    return patch("/api/usuario/me", payload);
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

export function convertirmeEnAdvertiser(payload) {
  return post("/api/usuario/convertirse-anunciante", payload);
}

export function dejarDeSerAdvertiser() {
  return post("/api/usuario/dejar-de-ser-anunciante", {});
}