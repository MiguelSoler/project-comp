import { apiFetch } from "./apiClient.js";

const ADMIN_USUARIOS_PATH = "/api/admin/usuario";

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (value === "all") return;
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function buildPatchOptions(payload) {
  if (payload instanceof FormData) {
    return {
      method: "PATCH",
      body: payload,
    };
  }

  const cleanPayload = Object.fromEntries(
    Object.entries(payload || {}).filter(([, value]) => value !== undefined)
  );

  return {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cleanPayload),
  };
}

export async function listAdminUsuarios(params = {}) {
  const limit = Number(params.limit || 9);

  const queryString = buildQueryString({
    page: params.page,
    limit,
    q: params.q,
    rol: params.rol,
    activo: params.activo,
    sort: params.sort,
  });

  const data = await apiFetch(`${ADMIN_USUARIOS_PATH}${queryString}`);
  const total = Number(data?.total || 0);

  return {
    ...data,
    items: Array.isArray(data?.users) ? data.users : [],
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getAdminUsuarioById(usuarioId) {
  return apiFetch(`${ADMIN_USUARIOS_PATH}/${usuarioId}`);
}

export async function updateAdminUsuario(usuarioId, payload) {
  return apiFetch(
    `${ADMIN_USUARIOS_PATH}/${usuarioId}`,
    buildPatchOptions(payload)
  );
}

export async function updateAdminUsuarioFoto(usuarioId, formData) {
  return apiFetch(`${ADMIN_USUARIOS_PATH}/${usuarioId}/foto`, {
    method: "PATCH",
    body: formData,
  });
}

export async function deleteAdminUsuarioFoto(usuarioId) {
  return apiFetch(`${ADMIN_USUARIOS_PATH}/${usuarioId}/foto`, {
    method: "DELETE",
  });
}

export async function reactivateAdminUsuario(usuarioId) {
  return updateAdminUsuario(usuarioId, { activo: true });
}

export async function resetAdminUsuarioPassword(usuarioId, payload) {
  return apiFetch(`${ADMIN_USUARIOS_PATH}/${usuarioId}/password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      password: payload?.password,
    }),
  });
}

export async function deactivateAdminUsuario(usuarioId) {
  return apiFetch(`${ADMIN_USUARIOS_PATH}/${usuarioId}`, {
    method: "DELETE",
  });
}