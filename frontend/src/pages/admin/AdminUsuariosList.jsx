import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { getApiErrorMessage } from "../../services/apiClient.js";
import {
  deactivateAdminUsuario,
  listAdminUsuarios,
  reactivateAdminUsuario,
} from "../../services/adminUsuarioService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const SORT_OPTIONS = [
  { value: "newest", label: "Más recientes" },
  { value: "updated", label: "Actualizados" },
  { value: "oldest", label: "Más antiguos" },
];

const ROLE_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "user", label: "Inquilino" },
  { value: "advertiser", label: "Anunciante" },
  { value: "admin", label: "Admin" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "true", label: "Activos" },
  { value: "false", label: "Inactivos" },
];

function buildImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function formatRoleLabel(rol) {
  if (rol === "admin") return "Admin";
  if (rol === "advertiser") return "Anunciante";
  if (rol === "user") return "Inquilino";
  return "Sin rol";
}

function getRoleBadgeClassName(rol) {
  if (rol === "admin") return "badge badge-info";
  if (rol === "advertiser") return "badge badge-warning";
  if (rol === "user") return "badge badge-neutral";
  return "badge badge-neutral";
}

function formatDisplayName(usuario) {
  const nombre = usuario?.nombre || "";
  const apellidos = usuario?.apellidos || "";
  const fullName = `${nombre} ${apellidos}`.trim();

  if (fullName) return fullName;
  if (usuario?.email) return usuario.email;
  return `Usuario #${usuario?.id ?? "—"}`;
}

function getInitials(usuario) {
  const nombre = usuario?.nombre || "";
  const apellidos = usuario?.apellidos || "";
  const source = `${nombre} ${apellidos}`.trim() || usuario?.email || "U";

  return source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatRegisterDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getSortLabel(value) {
  return SORT_OPTIONS.find((option) => option.value === value)?.label || "Ordenar";
}

export default function AdminUsuariosList() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(9);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [q, setQ] = useState("");
  const [rolFilter, setRolFilter] = useState("all");
  const [activoFilter, setActivoFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);

  const [openMenuUsuarioId, setOpenMenuUsuarioId] = useState(null);
  const [usuarioActionTarget, setUsuarioActionTarget] = useState(null);
  const [usuarioActionType, setUsuarioActionType] = useState("");
  const [changingUsuarioId, setChangingUsuarioId] = useState(null);
  const [usuarioCardFeedback, setUsuarioCardFeedback] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (q.trim()) count += 1;
    if (rolFilter !== "all") count += 1;
    if (activoFilter !== "all") count += 1;
    return count;
  }, [q, rolFilter, activoFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadUsuarios() {
      try {
        setLoading(true);
        setError("");

        const data = await listAdminUsuarios({
          page,
          limit,
          q: q.trim() || undefined,
          rol: rolFilter === "all" ? undefined : rolFilter,
          activo: activoFilter,
          sort,
        });

        if (!isMounted) return;

        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotalPages(Number(data?.totalPages || 1));
        setTotal(Number(data?.total || 0));
      } catch (err) {
        if (!isMounted) return;
        setError(getApiErrorMessage(err, "No se pudieron cargar los usuarios."));
        setItems([]);
        setTotalPages(1);
        setTotal(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUsuarios();

    return () => {
      isMounted = false;
    };
  }, [page, limit, q, rolFilter, activoFilter, sort, reloadKey]);

  function handleClearFilters() {
    setQ("");
    setRolFilter("all");
    setActivoFilter("all");
    setSort("newest");
    setPage(1);
    setOpenMenuUsuarioId(null);
  }

  function toggleUsuarioMenu(usuarioId, event) {
    event.stopPropagation();
    setOpenMenuUsuarioId((prev) => (prev === usuarioId ? null : usuarioId));
  }

  function openUsuarioActionModal(usuario, actionType, event) {
    event.stopPropagation();
    setOpenMenuUsuarioId(null);
    setUsuarioActionTarget(usuario);
    setUsuarioActionType(actionType);
  }

  function closeUsuarioActionModal() {
    if (changingUsuarioId) return;
    setUsuarioActionTarget(null);
    setUsuarioActionType("");
  }

  async function handleConfirmUsuarioAction() {
    if (!usuarioActionTarget || !usuarioActionType) return;

    try {
      setChangingUsuarioId(usuarioActionTarget.id);
      setError("");

      setUsuarioCardFeedback((prev) => {
        const next = { ...prev };
        delete next[usuarioActionTarget.id];
        return next;
      });

      if (usuarioActionType === "deactivate") {
        await deactivateAdminUsuario(usuarioActionTarget.id);
      } else {
        await reactivateAdminUsuario(usuarioActionTarget.id);
      }

      if (activoFilter === "all") {
        setItems((prev) =>
          prev.map((item) =>
            item.id === usuarioActionTarget.id
              ? {
                  ...item,
                  activo: usuarioActionType === "reactivate",
                }
              : item
          )
        );
      } else {
        setReloadKey((prev) => prev + 1);
      }

      setUsuarioCardFeedback((prev) => ({
        ...prev,
        [usuarioActionTarget.id]: {
          type: "success",
          message:
            usuarioActionType === "deactivate"
              ? "Usuario desactivado correctamente."
              : "Usuario reactivado correctamente.",
        },
      }));

      setUsuarioActionTarget(null);
      setUsuarioActionType("");
    } catch (err) {
      setUsuarioCardFeedback((prev) => ({
        ...prev,
        [usuarioActionTarget.id]: {
          type: "error",
          message: getApiErrorMessage(
            err,
            usuarioActionType === "deactivate"
              ? "No se pudo desactivar el usuario."
              : "No se pudo reactivar el usuario."
          ),
        },
      }));
    } finally {
      setChangingUsuarioId(null);
    }
  }

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <>
      <PageShell
        title="Listado de usuarios"
        subtitle={`Gestiona todos los usuarios de la plataforma. Total: ${total}`}
        variant="plain"
        contentClassName="space-y-4"
        actions={
          <div className="responsive-actions">
            <Link to="/admin" className="btn btn-secondary btn-sm">
              Volver
            </Link>

            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!hasPrev || loading}
                onClick={() => setPage((prev) => prev - 1)}
              >
                Anterior
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!hasNext || loading}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        }
      >
        <div className="xl:hidden sticky top-3 z-20">
          <div className="rounded-2xl border border-sky-200 bg-white/95 p-2 shadow-sm backdrop-blur">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm justify-between"
                onClick={() => setIsFiltersModalOpen(true)}
              >
                <span>Filtros</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    activeFilterCount > 0
                      ? "bg-blue-100 text-brand-primary"
                      : "bg-slate-100 text-ui-text-secondary"
                  }`}
                >
                  {activeFilterCount}
                </span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm justify-between border-2 border-brand-primary font-semibold"
                onClick={() => setIsSortModalOpen(true)}
              >
                <span>Ordenar</span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-brand-primary">
                  {getSortLabel(sort)}
                </span>
              </button>
            </div>
          </div>
        </div>

        {error ? <div className="alert-error">{error}</div> : null}

        <div className="hidden xl:block rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 shadow-sm">
          <div className="card-body space-y-4">
            <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-ui-text">Búsqueda y filtros</h2>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleClearFilters}
                >
                  Limpiar filtros
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="sm:col-span-2 xl:col-span-2">
                  <label className="label" htmlFor="admin-usuarios-q">
                    Buscar
                  </label>
                  <input
                    id="admin-usuarios-q"
                    type="text"
                    className="input"
                    placeholder="Nombre, apellidos o email"
                    value={q}
                    onChange={(event) => {
                      setQ(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="admin-usuarios-rol">
                    Rol
                  </label>
                  <select
                    id="admin-usuarios-rol"
                    className="select"
                    value={rolFilter}
                    onChange={(event) => {
                      setRolFilter(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">Todos</option>
                    <option value="user">Inquilino</option>
                    <option value="advertiser">Anunciante</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="admin-usuarios-activo">
                    Estado
                  </label>
                  <select
                    id="admin-usuarios-activo"
                    className="select"
                    value={activoFilter}
                    onChange={(event) => {
                      setActivoFilter(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="all">Todos</option>
                    <option value="true">Activos</option>
                    <option value="false">Inactivos</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <label
                    className="label font-semibold text-brand-primary"
                    htmlFor="admin-usuarios-sort"
                  >
                    Ordenar por
                  </label>
                  <select
                    id="admin-usuarios-sort"
                    className="select border-2 border-brand-primary bg-white font-semibold text-ui-text shadow-sm focus:border-brand-primary"
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="newest">Más recientes</option>
                    <option value="updated">Actualizados</option>
                    <option value="oldest">Más antiguos</option>
                  </select>
                </div>
              </div>
            </form>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card">
                <div className="card-body space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="skeleton h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-5 w-2/3" />
                      <div className="skeleton h-4 w-1/2" />
                    </div>
                  </div>
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-4 w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="card">
            <div className="card-body">
              <p className="text-sm text-ui-text-secondary">
                No hay usuarios para los filtros seleccionados.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((usuario) => {
                const avatarUrl = buildImageUrl(usuario.foto_perfil_url);
                const isInactive = !usuario.activo;

                return (
                  <article key={usuario.id} className="card card-hover relative overflow-hidden">
                    <button
                      type="button"
                      className="absolute right-[10px] top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-sky-300 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white shadow-[0_0_0_3px_rgba(96,165,250,0.35)] transition-all hover:from-sky-500 hover:via-blue-600 hover:to-indigo-700 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.4)]"
                      onClick={(event) => toggleUsuarioMenu(usuario.id, event)}
                      aria-label="Más acciones"
                    >
                      <span className="flex items-center justify-center gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-white" />
                        <span className="h-1 w-1 rounded-full bg-white" />
                        <span className="h-1 w-1 rounded-full bg-white" />
                      </span>
                    </button>

                    {openMenuUsuarioId === usuario.id ? (
                      <div
                        className="absolute right-3 top-12 z-30 min-w-[180px] rounded-lg border border-ui-border bg-white p-2 shadow-modal"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {usuario.activo ? (
                          <button
                            type="button"
                            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ui-text hover:bg-red-100"
                            onClick={(event) =>
                              openUsuarioActionModal(usuario, "deactivate", event)
                            }
                          >
                            Desactivar usuario
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ui-text hover:bg-green-100"
                            onClick={(event) =>
                              openUsuarioActionModal(usuario, "reactivate", event)
                            }
                          >
                            Reactivar usuario
                          </button>
                        )}
                      </div>
                    ) : null}

                    <div
                      role="button"
                      tabIndex={0}
                      className={`card-body space-y-4 ${isInactive ? "opacity-45" : ""}`}
                      onClick={() => {
                        setOpenMenuUsuarioId(null);
                        navigate(`/admin/usuario/${usuario.id}`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setOpenMenuUsuarioId(null);
                          navigate(`/admin/usuario/${usuario.id}`);
                        }
                      }}
                    >
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-4">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={formatDisplayName(usuario)}
                              className="h-16 w-16 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-brand-primary">
                              {getInitials(usuario)}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold text-ui-text">
                              {formatDisplayName(usuario)}
                            </p>
                            <p className="truncate text-sm text-ui-text-secondary">
                              {usuario.email || "Sin email"}
                            </p>
                            <p className="mt-1 text-xs text-ui-text-secondary">
                              ID #{usuario.id}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={usuario.activo ? "badge badge-success" : "badge badge-neutral"}
                        >
                          {usuario.activo ? "Activo" : "Inactivo"}
                        </span>

                        <span className={getRoleBadgeClassName(usuario.rol)}>
                          {formatRoleLabel(usuario.rol)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm text-ui-text-secondary">
                          <span className="font-medium text-ui-text">Teléfono:</span>{" "}
                          {usuario.telefono || "Sin teléfono"}
                        </p>

                        <p className="text-sm text-ui-text-secondary">
                          <span className="font-medium text-ui-text">Registro:</span>{" "}
                          {formatRegisterDate(
                            usuario.fecha_registro || usuario.created_at || usuario.updated_at
                          )}
                        </p>
                      </div>
                    </div>

                    {usuarioCardFeedback[usuario.id] ? (
                      <div
                        className={`mx-4 mb-4 ${
                          usuarioCardFeedback[usuario.id].type === "success"
                            ? "alert-success"
                            : "alert-error"
                        }`}
                      >
                        {usuarioCardFeedback[usuario.id].message}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ui-text-secondary">
                Página <span className="font-medium text-ui-text">{page}</span> de{" "}
                <span className="font-medium text-ui-text">{totalPages}</span> · Total:{" "}
                <span className="font-medium text-ui-text">{total}</span>
              </p>

              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!hasPrev || loading}
                  onClick={() => setPage((prev) => prev - 1)}
                >
                  Anterior
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!hasNext || loading}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </PageShell>

      <Modal
        open={isFiltersModalOpen}
        title="Filtros"
        onClose={() => setIsFiltersModalOpen(false)}
        size="default"
        closeLabel="Cerrar"
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="admin-usuarios-modal-q">
              Buscar
            </label>
            <input
              id="admin-usuarios-modal-q"
              type="text"
              className="input"
              placeholder="Nombre, apellidos o email"
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div>
            <label className="label" htmlFor="admin-usuarios-modal-rol">
              Rol
            </label>
            <select
              id="admin-usuarios-modal-rol"
              className="select"
              value={rolFilter}
              onChange={(event) => {
                setRolFilter(event.target.value);
                setPage(1);
              }}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="admin-usuarios-modal-activo">
              Estado
            </label>
            <select
              id="admin-usuarios-modal-activo"
              className="select"
              value={activoFilter}
              onChange={(event) => {
                setActivoFilter(event.target.value);
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClearFilters}
            >
              Limpiar
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsFiltersModalOpen(false)}
            >
              Aplicar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isSortModalOpen}
        title="Ordenar por"
        onClose={() => setIsSortModalOpen(false)}
        size="default"
        closeLabel="Cerrar"
      >
        <div className="space-y-3">
          {SORT_OPTIONS.map((option) => {
            const isActive = sort === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                  isActive
                    ? "border-brand-primary bg-blue-50 text-brand-primary shadow-sm"
                    : "border-slate-200 bg-white text-ui-text hover:border-brand-primary hover:bg-blue-50/60"
                }`}
                onClick={() => {
                  setSort(option.value);
                  setPage(1);
                  setIsSortModalOpen(false);
                }}
              >
                <span className="font-medium">{option.label}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isActive
                      ? "bg-blue-100 text-brand-primary"
                      : "bg-slate-100 text-ui-text-secondary"
                  }`}
                >
                  {isActive ? "Actual" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={Boolean(usuarioActionTarget)}
        title={
          usuarioActionType === "reactivate"
            ? "Confirmar reactivación"
            : "Confirmar desactivación"
        }
        onClose={closeUsuarioActionModal}
        size="md"
        tone={usuarioActionType === "reactivate" ? "default" : "danger"}
        closeLabel="Cancelar"
        closeOnOverlay={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-ui-text-secondary">
            {usuarioActionType === "reactivate"
              ? "Vas a reactivar este usuario para que vuelva a tener acceso a la plataforma."
              : "Vas a desactivar este usuario."}
          </p>

          <div
            className={
              usuarioActionType === "reactivate"
                ? "rounded-lg border border-emerald-200 bg-emerald-50 p-4"
                : "rounded-lg border border-red-200 bg-red-50 p-4"
            }
          >
            <p
              className={
                usuarioActionType === "reactivate"
                  ? "text-sm font-semibold text-emerald-700"
                  : "text-sm font-semibold text-red-700"
              }
            >
              {formatDisplayName(usuarioActionTarget)}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeUsuarioActionModal}
              disabled={Boolean(changingUsuarioId)}
            >
              Cancelar
            </button>

            <button
              type="button"
              className={
                usuarioActionType === "reactivate"
                  ? "btn btn-sm border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  : "btn btn-danger btn-sm"
              }
              onClick={handleConfirmUsuarioAction}
              disabled={Boolean(changingUsuarioId)}
            >
              {changingUsuarioId
                ? usuarioActionType === "reactivate"
                  ? "Reactivando..."
                  : "Desactivando..."
                : usuarioActionType === "reactivate"
                  ? "Sí, reactivar"
                  : "Sí, desactivar"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}