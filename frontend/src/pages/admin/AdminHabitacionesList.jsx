import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import PageShell from "../../components/layout/PageShell.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { getApiErrorMessage } from "../../services/apiClient.js";
import {
  deactivateAdminHabitacion,
  listAdminHabitaciones,
  reactivateAdminHabitacion,
} from "../../services/adminHabitacionService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const SORT_OPTIONS = [
  { value: "newest", label: "Más recientes" },
  { value: "updated", label: "Actualizadas" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
];

const BOOLEAN_FILTER_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "true", label: "Sí" },
  { value: "false", label: "No" },
];

const DISPONIBILIDAD_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "true", label: "Solo disponibles" },
  { value: "false", label: "No disponibles" },
];

const ACTIVO_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "true", label: "Activas" },
  { value: "false", label: "Inactivas" },
];

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

function getSortLabel(value) {
  return SORT_OPTIONS.find((option) => option.value === value)?.label || "Ordenar";
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

  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);

  const [openMenuHabitacionId, setOpenMenuHabitacionId] = useState(null);
  const [habitacionActionTarget, setHabitacionActionTarget] = useState(null);
  const [habitacionActionType, setHabitacionActionType] = useState("");
  const [changingHabitacionId, setChangingHabitacionId] = useState(null);
  const [habitacionCardFeedback, setHabitacionCardFeedback] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (q.trim()) count += 1;
    if (ciudad.trim()) count += 1;
    if (precioMin !== "") count += 1;
    if (precioMax !== "") count += 1;
    if (tamanoMin !== "") count += 1;
    if (activoFilter !== "all") count += 1;
    if (disponibleFilter !== "all") count += 1;
    if (amuebladaFilter !== "all") count += 1;
    if (banoFilter !== "all") count += 1;
    if (balconFilter !== "all") count += 1;
    return count;
  }, [
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
  ]);

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
        setError(getApiErrorMessage(err, "No se pudieron cargar las habitaciones."));
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
                  <label
                    className="label font-semibold text-brand-primary"
                    htmlFor="admin-habitaciones-sort"
                  >
                    Ordenar por
                  </label>
                  <select
                    id="admin-habitaciones-sort"
                    className="select border-2 border-brand-primary bg-white font-semibold text-ui-text shadow-sm focus:border-brand-primary"
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
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card">
                <div className="card-body space-y-3">
                  <div className="skeleton aspect-[16/10] w-full sm:aspect-[4/3]" />
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((habitacion) => {
                const cover = buildImageUrl(habitacion.cover_foto_habitacion_url);
                const isInactive = !habitacion.activo;

                return (
                  <article
                    key={habitacion.id}
                    className="card card-hover relative overflow-hidden"
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
                          className="aspect-[16/10] w-full rounded-md object-cover sm:aspect-[4/3]"
                        />
                      ) : (
                        <div className="skeleton aspect-[16/10] w-full sm:aspect-[4/3]" />
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <h2 className="min-w-0 text-base font-semibold text-ui-text">
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

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          Piso asociado
                        </p>
                        <p className="mt-1 text-sm font-semibold text-ui-text">
                          Piso #{habitacion.piso_id}
                        </p>
                      </div>
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
            <label className="label" htmlFor="admin-habitaciones-modal-q">
              Buscar
            </label>
            <input
              id="admin-habitaciones-modal-q"
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
            <label className="label" htmlFor="admin-habitaciones-modal-ciudad">
              Ciudad
            </label>
            <input
              id="admin-habitaciones-modal-ciudad"
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="admin-habitaciones-modal-precio-min">
                Precio mínimo
              </label>
              <input
                id="admin-habitaciones-modal-precio-min"
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
              <label className="label" htmlFor="admin-habitaciones-modal-precio-max">
                Precio máximo
              </label>
              <input
                id="admin-habitaciones-modal-precio-max"
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
          </div>

          <div>
            <label className="label" htmlFor="admin-habitaciones-modal-tamano-min">
              Tamaño mínimo (m²)
            </label>
            <input
              id="admin-habitaciones-modal-tamano-min"
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

          <div>
            <label className="label" htmlFor="admin-habitaciones-modal-disponible">
              Disponibilidad
            </label>
            <select
              id="admin-habitaciones-modal-disponible"
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
            <label className="label" htmlFor="admin-habitaciones-modal-activo">
              Estado
            </label>
            <select
              id="admin-habitaciones-modal-activo"
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="admin-habitaciones-modal-amueblada">
                Amueblada
              </label>
              <select
                id="admin-habitaciones-modal-amueblada"
                className="select"
                value={amuebladaFilter}
                onChange={(event) => {
                  setAmuebladaFilter(event.target.value);
                  setPage(1);
                }}
              >
                {BOOLEAN_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="admin-habitaciones-modal-bano">
                Baño
              </label>
              <select
                id="admin-habitaciones-modal-bano"
                className="select"
                value={banoFilter}
                onChange={(event) => {
                  setBanoFilter(event.target.value);
                  setPage(1);
                }}
              >
                {BOOLEAN_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="admin-habitaciones-modal-balcon">
                Balcón
              </label>
              <select
                id="admin-habitaciones-modal-balcon"
                className="select"
                value={balconFilter}
                onChange={(event) => {
                  setBalconFilter(event.target.value);
                  setPage(1);
                }}
              >
                {BOOLEAN_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
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