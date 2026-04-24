import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import PageShell from "../../components/layout/PageShell.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { getApiErrorMessage } from "../../services/apiClient.js";
import {
  deactivateAdminHabitacion,
  listAdminHabitaciones,
  reactivateAdminHabitacion,
} from "../../services/adminHabitacionService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function buildImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function formatEur(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${new Intl.NumberFormat("es-ES").format(n)} €`;
}

export default function AdminHabitacionesList() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(9);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [q, setQ] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [tamanoMin, setTamanoMin] = useState("");
  const [activoFilter, setActivoFilter] = useState("all");
  const [disponibleFilter, setDisponibleFilter] = useState("all");
  const [amuebladaFilter, setAmuebladaFilter] = useState("all");
  const [banoFilter, setBanoFilter] = useState("all");
  const [balconFilter, setBalconFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const [openMenuHabitacionId, setOpenMenuHabitacionId] = useState(null);
  const [habitacionActionTarget, setHabitacionActionTarget] = useState(null);
  const [habitacionActionType, setHabitacionActionType] = useState("");
  const [changingHabitacionId, setChangingHabitacionId] = useState(null);
  const [habitacionCardFeedback, setHabitacionCardFeedback] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadHabitaciones() {
      try {
        setLoading(true);
        setError("");

        const data = await listAdminHabitaciones({
          page,
          limit,
          q: q.trim() || undefined,
          ciudad: ciudad.trim() || undefined,
          precioMin: precioMin || undefined,
          precioMax: precioMax || undefined,
          tamanoMin: tamanoMin || undefined,
          activo: activoFilter,
          disponible: disponibleFilter,
          amueblada: amuebladaFilter,
          bano: banoFilter,
          balcon: balconFilter,
          sort,
        });

        if (!isMounted) return;

        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotalPages(Number(data?.totalPages || 1));
        setTotal(Number(data?.total || 0));
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudieron cargar las habitaciones.");
        setItems([]);
        setTotalPages(1);
        setTotal(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHabitaciones();

    return () => {
      isMounted = false;
    };
  }, [
    page,
    limit,
    q,
    ciudad,
    precioMin,
    precioMax,
    tamanoMin,
    activoFilter,
    disponibleFilter,
    amuebladaFilter,
    banoFilter,
    balconFilter,
    sort,
    reloadKey,
  ]);

  function handleClearFilters() {
    setQ("");
    setCiudad("");
    setPrecioMin("");
    setPrecioMax("");
    setTamanoMin("");
    setActivoFilter("all");
    setDisponibleFilter("all");
    setAmuebladaFilter("all");
    setBanoFilter("all");
    setBalconFilter("all");
    setSort("newest");
    setPage(1);
    setOpenMenuHabitacionId(null);
  }

  function toggleHabitacionMenu(habitacionId, event) {
    event.stopPropagation();
    setOpenMenuHabitacionId((prev) => (prev === habitacionId ? null : habitacionId));
  }

  function openHabitacionActionModal(habitacion, actionType, event) {
    event.stopPropagation();
    setOpenMenuHabitacionId(null);
    setHabitacionActionTarget(habitacion);
    setHabitacionActionType(actionType);
  }

  function closeHabitacionActionModal() {
    if (changingHabitacionId) return;
    setHabitacionActionTarget(null);
    setHabitacionActionType("");
  }

  async function handleConfirmHabitacionAction() {
  const habitacion = habitacionActionTarget;
  const actionType = habitacionActionType;

  if (!habitacion || !actionType) return;

  try {
    setChangingHabitacionId(habitacion.id);
    setError("");

    setHabitacionCardFeedback((prev) => {
      const next = { ...prev };
      delete next[habitacion.id];
      return next;
    });

    if (actionType === "deactivate") {
      await deactivateAdminHabitacion(habitacion.id);
    } else {
      await reactivateAdminHabitacion(habitacion.id);
    }

    if (activoFilter === "all") {
      setItems((prev) =>
        prev.map((item) =>
          item.id === habitacion.id
            ? {
                ...item,
                activo: actionType === "reactivate",
              }
            : item
        )
      );
    } else {
      setReloadKey((prev) => prev + 1);
    }

    setHabitacionCardFeedback((prev) => ({
      ...prev,
      [habitacion.id]: {
        type: "success",
        message:
          actionType === "deactivate"
            ? "Habitación desactivada correctamente."
            : "Habitación reactivada correctamente.",
      },
    }));

    setHabitacionActionTarget(null);
    setHabitacionActionType("");
  } catch (err) {
    const message =
      err?.error === "ROOM_OCCUPIED"
        ? "No puedes desactivar esta habitación mientras esté ocupada."
        : getApiErrorMessage(
          err,
          actionType === "deactivate"
            ? "No se pudo desactivar la habitación."
            : "No se pudo reactivar la habitación."
        );

    setHabitacionCardFeedback((prev) => ({
      ...prev,
      [habitacion.id]: {
        type: "error",
        message,
      },
    }));

    setError(message);
    setHabitacionActionTarget(null);
    setHabitacionActionType("");
  } finally {
    setChangingHabitacionId(null);
  }
}

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <>
      <PageShell
        title="Listado de habitaciones"
        subtitle={`Gestiona todas las habitaciones de la plataforma. Total: ${total}`}
        variant="plain"
        contentClassName="space-y-4"
        actions={
          <div className="flex flex-col items-end gap-4">
            <Link to="/admin" className="btn btn-secondary btn-sm">
              Volver
            </Link>

            <div className="flex items-center gap-2">
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
        {error ? <div className="alert-error">{error}</div> : null}

        <div className="rounded-2xl border border-slate-300 bg-white p-4 md:p-5">
          <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-ui-text">Búsqueda y filtros</h2>

              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearFilters}>
                  Limpiar filtros
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div>
                <label className="label" htmlFor="admin-habitaciones-q">
                  Buscar
                </label>
                <input
                  id="admin-habitaciones-q"
                  type="text"
                  className="input"
                  placeholder="Título o descripción"
                  value={q}
                  onChange={(event) => {
                    setQ(event.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div>
                <label className="label" htmlFor="admin-habitaciones-ciudad">
                  Ciudad
                </label>
                <input
                  id="admin-habitaciones-ciudad"
                  type="text"
                  className="input"
                  placeholder="Ej. Madrid"
                  value={ciudad}
                  onChange={(event) => {
                    setCiudad(event.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div>
                <label className="label" htmlFor="admin-habitaciones-precio-min">
                  Precio mínimo
                </label>
                <input
                  id="admin-habitaciones-precio-min"
                  type="number"
                  min="0"
                  className="input"
                  placeholder="Ej. 300"
                  value={precioMin}
                  onChange={(event) => {
                    setPrecioMin(event.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div>
                <label className="label" htmlFor="admin-habitaciones-precio-max">
                  Precio máximo
                </label>
                <input
                  id="admin-habitaciones-precio-max"
                  type="number"
                  min="0"
                  className="input"
                  placeholder="Ej. 700"
                  value={precioMax}
                  onChange={(event) => {
                    setPrecioMax(event.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div>
                <label className="label" htmlFor="admin-habitaciones-tamano-min">
                  Tamaño mínimo (m²)
                </label>
                <input
                  id="admin-habitaciones-tamano-min"
                  type="number"
                  min="1"
                  className="input"
                  placeholder="Ej. 10"
                  value={tamanoMin}
                  onChange={(event) => {
                    setTamanoMin(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
              <div>
                <label className="label" htmlFor="admin-habitaciones-disponible">
                  Disponibilidad
                </label>
                <select
                  id="admin-habitaciones-disponible"
                  className="select"
                  value={disponibleFilter}
                  onChange={(event) => {
                    setDisponibleFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Todas</option>
                  <option value="true">Solo disponibles</option>
                  <option value="false">No disponibles</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="admin-habitaciones-activo">
                  Estado
                </label>
                <select
                  id="admin-habitaciones-activo"
                  className="select"
                  value={activoFilter}
                  onChange={(event) => {
                    setActivoFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Todas</option>
                  <option value="true">Activas</option>
                  <option value="false">Inactivas</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="admin-habitaciones-amueblada">
                  Amueblada
                </label>
                <select
                  id="admin-habitaciones-amueblada"
                  className="select"
                  value={amuebladaFilter}
                  onChange={(event) => {
                    setAmuebladaFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Todas</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="admin-habitaciones-bano">
                  Baño
                </label>
                <select
                  id="admin-habitaciones-bano"
                  className="select"
                  value={banoFilter}
                  onChange={(event) => {
                    setBanoFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Todas</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="admin-habitaciones-balcon">
                  Balcón
                </label>
                <select
                  id="admin-habitaciones-balcon"
                  className="select"
                  value={balconFilter}
                  onChange={(event) => {
                    setBalconFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Todas</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="admin-habitaciones-sort">
                  Ordenar por
                </label>
                <select
                  id="admin-habitaciones-sort"
                  className="select"
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="newest">Más recientes</option>
                  <option value="updated">Actualizadas</option>
                  <option value="precio_asc">Precio: menor a mayor</option>
                  <option value="precio_desc">Precio: mayor a menor</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card">
                <div className="card-body space-y-3">
                  <div className="skeleton aspect-[4/3] w-full" />
                  <div className="skeleton h-5 w-2/3" />
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="card">
            <div className="card-body">
              <p className="text-sm text-ui-text-secondary">
                No hay habitaciones para los filtros seleccionados.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((habitacion) => {
                const cover = buildImageUrl(habitacion.cover_foto_habitacion_url);
                const isInactive = !habitacion.activo;

                return (
                  <article
                    key={habitacion.id}
                    className="card card-hover relative"
                  >
                    <button
                      type="button"
                      className="absolute right-[10px] top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-sky-300 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white shadow-[0_0_0_3px_rgba(96,165,250,0.35)] transition-all hover:from-sky-500 hover:via-blue-600 hover:to-indigo-700 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.4)]"
                      onClick={(event) => toggleHabitacionMenu(habitacion.id, event)}
                      aria-label="Más acciones"
                    >
                      <span className="flex items-center justify-center gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-white" />
                        <span className="h-1 w-1 rounded-full bg-white" />
                        <span className="h-1 w-1 rounded-full bg-white" />
                      </span>
                    </button>

                    {openMenuHabitacionId === habitacion.id ? (
                      <div
                        className="absolute right-3 top-12 z-30 min-w-[190px] rounded-lg border border-ui-border bg-white p-2 shadow-modal"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {habitacion.activo ? (
                          <button
                            type="button"
                            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ui-text hover:bg-red-100"
                            onClick={(event) =>
                              openHabitacionActionModal(habitacion, "deactivate", event)
                            }
                          >
                            Desactivar habitación
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ui-text hover:bg-green-100"
                            onClick={(event) =>
                              openHabitacionActionModal(habitacion, "reactivate", event)
                            }
                          >
                            Reactivar habitación
                          </button>
                        )}
                      </div>
                    ) : null}

                    <div
                      role="button"
                      tabIndex={0}
                      className={`card-body space-y-3 ${isInactive ? "opacity-45" : ""}`}
                      onClick={() => {
                        setOpenMenuHabitacionId(null);
                        navigate(`/admin/habitacion/${habitacion.id}`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setOpenMenuHabitacionId(null);
                          navigate(`/admin/habitacion/${habitacion.id}`);
                        }
                      }}
                    >
                      {cover ? (
                        <img
                          src={cover}
                          alt={habitacion.titulo || `Habitación ${habitacion.id}`}
                          className="aspect-[4/3] w-full rounded-md object-cover"
                        />
                      ) : (
                        <div className="skeleton aspect-[4/3] w-full" />
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-base font-semibold text-ui-text">
                          {habitacion.titulo || "Sin título"}
                        </h2>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <span
                            className={
                              habitacion.activo ? "badge badge-success" : "badge badge-neutral"
                            }
                          >
                            {habitacion.activo ? "Activa" : "Inactiva"}
                          </span>

                          <span
                            className={
                              habitacion.disponible ? "badge badge-info" : "badge badge-warning"
                            }
                          >
                            {habitacion.disponible ? "Disponible" : "No disponible"}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-ui-text-secondary">
                        <span className="font-medium text-ui-text">
                          {formatEur(habitacion.precio_mensual)}
                        </span>{" "}
                        / mes
                        {habitacion.tamano_m2 ? ` · ${habitacion.tamano_m2} m²` : ""}
                      </p>

                      <p className="text-sm text-ui-text-secondary">
                        {habitacion.ciudad || "—"}
                        {habitacion.direccion ? ` · ${habitacion.direccion}` : ""}
                        {habitacion.codigo_postal ? ` · ${habitacion.codigo_postal}` : ""}
                      </p>

                      <p className="text-xs text-ui-text-secondary">
                        {habitacion.amueblada ? "Amueblada · " : ""}
                        {habitacion.bano ? "Baño · " : ""}
                        {habitacion.balcon ? "Balcón" : ""}
                      </p>

                      <p className="text-xs text-ui-text-secondary">
                        Piso #{habitacion.piso_id}
                      </p>
                    </div>

                    {habitacionCardFeedback[habitacion.id] ? (
                      <div
                        className={`mx-4 mb-4 ${
                          habitacionCardFeedback[habitacion.id].type === "success"
                            ? "alert-success"
                            : "alert-error"
                        }`}
                      >
                        {habitacionCardFeedback[habitacion.id].message}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-xs text-ui-text-secondary">
                Página <span className="font-medium text-ui-text">{page}</span> de{" "}
                <span className="font-medium text-ui-text">{totalPages}</span>
              </p>

              <div className="flex items-center gap-2">
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
        open={Boolean(habitacionActionTarget)}
        title={
          habitacionActionType === "reactivate"
            ? "Confirmar reactivación"
            : "Confirmar desactivación"
        }
        onClose={closeHabitacionActionModal}
        size="md"
        tone={habitacionActionType === "reactivate" ? "default" : "danger"}
        closeLabel="Cancelar"
        closeOnOverlay={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-ui-text-secondary">
            {habitacionActionType === "reactivate"
              ? "Vas a reactivar esta habitación para que vuelva a estar operativa."
              : "Vas a desactivar esta habitación."}
          </p>

          <div
            className={
              habitacionActionType === "reactivate"
                ? "rounded-lg border border-emerald-200 bg-emerald-50 p-4"
                : "rounded-lg border border-red-200 bg-red-50 p-4"
            }
          >
            <p
              className={
                habitacionActionType === "reactivate"
                  ? "text-sm font-semibold text-emerald-700"
                  : "text-sm font-semibold text-red-700"
              }
            >
              {habitacionActionTarget?.titulo || "Habitación sin título"}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeHabitacionActionModal}
              disabled={Boolean(changingHabitacionId)}
            >
              Cancelar
            </button>

            <button
              type="button"
              className={
                habitacionActionType === "reactivate"
                  ? "btn btn-sm border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  : "btn btn-danger btn-sm"
              }
              onClick={handleConfirmHabitacionAction}
              disabled={Boolean(changingHabitacionId)}
            >
              {changingHabitacionId
                ? habitacionActionType === "reactivate"
                  ? "Reactivando..."
                  : "Desactivando..."
                : habitacionActionType === "reactivate"
                  ? "Sí, reactivar"
                  : "Sí, desactivar"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
