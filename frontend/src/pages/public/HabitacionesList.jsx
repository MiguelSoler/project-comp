import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Modal from "../../components/ui/Modal.jsx";
import PageShell from "../../components/layout/PageShell.jsx";
import { getApiErrorMessage } from "../../services/apiClient.js";
import { listHabitaciones } from "../../services/habitacionService.js";
import useAuth from "../../hooks/useAuth.js";

function formatEur(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("es-ES").format(n) + " €";
}

function formatMetric(value) {
  if (value === null || value === undefined || value === "") return "—";

  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  return n.toFixed(1);
}

function buildImageUrl(pathOrNull) {
  if (!pathOrNull) return null;
  if (pathOrNull.startsWith("http")) return pathOrNull;

  const base = import.meta.env.VITE_API_BASE_URL || "";
  return `${base}${pathOrNull}`;
}

function getReputationVisuals({ score, hasVisibleReputation, convivientesActuales }) {
  if (!hasVisibleReputation) {
    return {
      boxClass: "rounded-xl border border-slate-300 bg-slate-50 p-3",
      bubbleClass:
        "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-bold text-slate-500 shadow-sm",
      labelClass: "text-[11px] font-semibold uppercase tracking-wide text-slate-600",
      statusText:
        convivientesActuales > 0
          ? "Sin valoraciones todavía"
          : "Sin convivientes actuales",
      helperText:
        convivientesActuales > 0
          ? "Todavía no se han emitido votos visibles en este piso"
          : "Ahora mismo no hay convivencia activa en este piso",
    };
  }

  const n = Number(score);

  if (n >= 3.5) {
    return {
      boxClass: "rounded-xl border border-emerald-300 bg-emerald-50 p-3",
      bubbleClass:
        "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-white text-xl font-bold text-emerald-700 shadow-sm",
      labelClass: "text-[11px] font-semibold uppercase tracking-wide text-emerald-700",
      statusText: "Buena convivencia",
      helperText: "El ambiente del piso transmite una convivencia positiva",
    };
  }

  if (n >= 2) {
    return {
      boxClass: "rounded-xl border border-amber-300 bg-amber-50 p-3",
      bubbleClass:
        "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white text-xl font-bold text-amber-700 shadow-sm",
      labelClass: "text-[11px] font-semibold uppercase tracking-wide text-amber-700",
      statusText: "Convivencia media",
      helperText: "La convivencia muestra señales mixtas o mejorables",
    };
  }

  return {
    boxClass: "rounded-xl border border-rose-300 bg-rose-50 p-3",
    bubbleClass:
      "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-white text-xl font-bold text-rose-700 shadow-sm",
    labelClass: "text-[11px] font-semibold uppercase tracking-wide text-rose-700",
    statusText: "Convivencia mejorable",
    helperText: "La reputación visible del piso es baja actualmente",
  };
}

const SORT_OPTIONS = [
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
  { value: "reputacion_desc", label: "Reputación: mayor a menor" },
  { value: "reputacion_asc", label: "Reputación: menor a mayor" },
  { value: "newest", label: "Más recientes" },
  { value: "tamano_desc", label: "Tamaño: mayor a menor" },
];

const INITIAL_FILTERS = {
  ciudad: "",
  precioMax: "",
  reputacionMin: "",
  disponible: "true",
  bano: "",
  balcon: "",
  amueblada: "",
  tamanoMin: "",
  tamanoMax: "",
  q: "",
  sort: "precio_asc",
};

function getSortLabel(sortValue) {
  return (
    SORT_OPTIONS.find((option) => option.value === sortValue)?.label ||
    "Precio: menor a mayor"
  );
}

function countActiveFilters(filters, isAdmin) {
  let count = 0;

  if (filters.q?.trim()) count += 1;
  if (filters.ciudad?.trim()) count += 1;
  if (filters.precioMax !== "") count += 1;
  if (filters.reputacionMin !== "") count += 1;
  if (filters.tamanoMin !== "") count += 1;
  if (filters.tamanoMax !== "") count += 1;
  if (filters.bano !== "") count += 1;
  if (filters.balcon !== "") count += 1;
  if (filters.amueblada !== "") count += 1;

  if (isAdmin && filters.disponible !== INITIAL_FILTERS.disponible) {
    count += 1;
  }

  return count;
}

function FiltersFields({
  values,
  onChange,
  isAdmin,
  showSort = true,
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <div className="sm:col-span-2 lg:col-span-2">
        <label className="label" htmlFor="q">
          Buscar
        </label>
        <input
          id="q"
          name="q"
          type="text"
          className="input"
          placeholder="Título o descripción"
          value={values.q}
          onChange={onChange}
        />
      </div>

      <div className="sm:col-span-2 lg:col-span-1">
        <label className="label" htmlFor="ciudad">
          Ciudad
        </label>
        <input
          id="ciudad"
          name="ciudad"
          type="text"
          className="input"
          placeholder="Ej. Madrid"
          value={values.ciudad}
          onChange={onChange}
        />
      </div>

      <div>
        <label className="label" htmlFor="precioMax">
          Precio máximo
        </label>
        <input
          id="precioMax"
          name="precioMax"
          type="number"
          min="0"
          className="input"
          placeholder="Ej. 500"
          value={values.precioMax}
          onChange={onChange}
        />
      </div>

      <div>
        <label className="label" htmlFor="tamanoMin">
          Tamaño mínimo (m²)
        </label>
        <input
          id="tamanoMin"
          name="tamanoMin"
          type="number"
          min="0"
          className="input"
          placeholder="Ej. 10"
          value={values.tamanoMin}
          onChange={onChange}
        />
      </div>

      {showSort ? (
        <div>
          <label className="label font-semibold text-brand-primary" htmlFor="sort">
            Ordenar por
          </label>
          <select
            id="sort"
            name="sort"
            className="select border-2 border-brand-primary bg-white font-semibold text-ui-text shadow-sm focus:border-brand-primary"
            value={values.sort}
            onChange={onChange}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor="tamanoMax">
          Tamaño máximo (m²)
        </label>
        <input
          id="tamanoMax"
          name="tamanoMax"
          type="number"
          min="0"
          className="input"
          placeholder="Ej. 25"
          value={values.tamanoMax}
          onChange={onChange}
        />
      </div>

      <div>
        <label className="label" htmlFor="reputacionMin">
          Reputación mínima
        </label>
        <select
          id="reputacionMin"
          name="reputacionMin"
          className="select"
          value={values.reputacionMin}
          onChange={onChange}
        >
          <option value="">Todas</option>
          <option value="4.5">4.5 o más</option>
          <option value="4">4 o más</option>
          <option value="3.5">3.5 o más</option>
          <option value="3">3 o más</option>
        </select>
      </div>

      {isAdmin ? (
        <div>
          <label className="label" htmlFor="disponible">
            Disponibilidad
          </label>
          <select
            id="disponible"
            name="disponible"
            className="select"
            value={values.disponible}
            onChange={onChange}
          >
            <option value="true">Solo disponibles</option>
            <option value="false">Solo no disponibles</option>
            <option value="">Todas</option>
          </select>
        </div>
      ) : null}

      <div>
        <label className="label" htmlFor="amueblada">
          Amueblada
        </label>
        <select
          id="amueblada"
          name="amueblada"
          className="select"
          value={values.amueblada}
          onChange={onChange}
        >
          <option value="">Todas</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="bano">
          Baño
        </label>
        <select
          id="bano"
          name="bano"
          className="select"
          value={values.bano}
          onChange={onChange}
        >
          <option value="">Todas</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="balcon">
          Balcón
        </label>
        <select
          id="balcon"
          name="balcon"
          className="select"
          value={values.balcon}
          onChange={onChange}
        >
          <option value="">Todas</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
      </div>
    </div>
  );
}

export default function HabitacionesList() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [mobileDraftFilters, setMobileDraftFilters] = useState(filters);

  const { user } = useAuth();
  const isAdmin = user?.rol === "admin";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMsg("");

      try {
        const res = await listHabitaciones({ page, limit, ...filters });

        if (cancelled) return;

        setItems(Array.isArray(res.items) ? res.items : []);
        setTotalPages(Number(res.totalPages || 1));
        setTotal(Number(res.total || 0));
      } catch (err) {
        if (cancelled) return;

        setErrorMsg(getApiErrorMessage(err, "No se pudieron cargar las habitaciones."));
        setItems([]);
        setTotalPages(1);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [page, filters]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    if (!isAdmin && filters.disponible !== "true") {
      setFilters((prev) => ({ ...prev, disponible: "true" }));
    }
  }, [isAdmin, filters.disponible]);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const subtitle = useMemo(() => {
    return `Página ${page} de ${totalPages} · Total: ${total}`;
  }, [page, totalPages, total]);

  const activeFiltersCount = useMemo(() => {
    return countActiveFilters(filters, isAdmin);
  }, [filters, isAdmin]);

  const currentSortLabel = useMemo(() => {
    return getSortLabel(filters.sort);
  }, [filters.sort]);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function handleMobileDraftChange(event) {
    const { name, value } = event.target;
    setMobileDraftFilters((prev) => ({ ...prev, [name]: value }));
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS);
  }

  function openFiltersModal() {
    setMobileDraftFilters(filters);
    setIsFiltersModalOpen(true);
  }

  function closeFiltersModal() {
    setIsFiltersModalOpen(false);
  }

  function applyMobileFilters() {
    setFilters((prev) => ({
      ...mobileDraftFilters,
      sort: prev.sort,
    }));
    setIsFiltersModalOpen(false);
  }

  function clearMobileDraftFilters() {
    setMobileDraftFilters((prev) => ({
      ...INITIAL_FILTERS,
      sort: prev.sort,
    }));
  }

  function openSortModal() {
    setIsSortModalOpen(true);
  }

  function closeSortModal() {
    setIsSortModalOpen(false);
  }

  function applySort(sortValue) {
    setFilters((prev) => ({ ...prev, sort: sortValue }));
    setIsSortModalOpen(false);
  }

  return (
    <>
      <PageShell
        title="Habitaciones"
        subtitle={subtitle}
        variant="plain"
        actions={
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              disabled={!hasPrev || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>

            <button
              className="btn btn-secondary btn-sm"
              type="button"
              disabled={!hasNext || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        }
      >
        <div className="sticky top-2 z-20 mb-4 lg:hidden">
          <div className="rounded-2xl border border-sky-200 bg-white/95 p-2 shadow-md backdrop-blur">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-xl border border-brand-primary bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-blue-50"
                onClick={openFiltersModal}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-primary">
                  Filtros
                </p>
                <p className="mt-1 text-sm font-semibold text-ui-text">
                  {activeFiltersCount > 0
                    ? `${activeFiltersCount} activo${activeFiltersCount === 1 ? "" : "s"}`
                    : "Sin filtros"}
                </p>
              </button>

              <button
                type="button"
                className="rounded-xl border border-brand-primary bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-blue-50"
                onClick={openSortModal}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-primary">
                  Ordenar
                </p>
                <p className="mt-1 text-sm font-semibold text-ui-text">
                  {currentSortLabel}
                </p>
              </button>
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="card mb-4 overflow-hidden border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 shadow-sm">
            <div className="card-body space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">Búsqueda y filtros</h2>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm w-full sm:w-auto"
                  onClick={resetFilters}
                >
                  Limpiar filtros
                </button>
              </div>

              <FiltersFields
                values={filters}
                onChange={handleFilterChange}
                isAdmin={isAdmin}
                showSort
              />
            </div>
          </div>
        </div>

        {errorMsg ? (
          <div className="alert-error">
            {errorMsg}{" "}
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => setPage((p) => p)}
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card">
                <div className="card-body space-y-3">
                  <div className="skeleton aspect-[16/10] w-full sm:aspect-[4/3]" />
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="card">
            <div className="card-body">
              <p className="text-sm text-ui-text-secondary">
                No hay habitaciones para mostrar.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((h) => {
                const disponible = h.disponible && !h.ocupada;
                const cover = buildImageUrl(
                  h.cover_foto_habitacion_url || h.cover_foto_piso_url
                );

                const convivientesActuales = Number(
                  h.convivencia_convivientes_actuales || 0
                );
                const convivientesConVotos = Number(
                  h.convivencia_convivientes_con_votos || 0
                );
                const hasVisibleReputation = convivientesConVotos > 0;
                const reputationScore = hasVisibleReputation
                  ? Number(h.convivencia_media_global)
                  : null;
                const convivenciaMedia = formatMetric(reputationScore);

                const reputationVisuals = getReputationVisuals({
                  score: reputationScore,
                  hasVisibleReputation,
                  convivientesActuales,
                });

                return (
                  <Link
                    key={h.id}
                    to={`/habitaciones/${h.id}`}
                    className="card card-hover overflow-hidden"
                  >
                    <div className="card-body space-y-3">
                      {cover ? (
                        <img
                          className="aspect-[16/10] w-full rounded-md object-cover sm:aspect-[4/3]"
                          src={cover}
                          alt={h.titulo || `Habitación ${h.id}`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="skeleton aspect-[16/10] w-full sm:aspect-[4/3]" />
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 text-base font-semibold leading-6">
                          {h.titulo}
                        </h3>

                        <span
                          className={
                            disponible
                              ? "badge badge-success"
                              : "badge badge-neutral"
                          }
                        >
                          {disponible ? "Disponible" : "No disponible"}
                        </span>
                      </div>

                      <p className="text-sm text-ui-text-secondary">
                        <span className="font-medium text-ui-text">
                          {formatEur(h.precio_mensual)}
                        </span>{" "}
                        / mes
                        {h.tamano_m2 ? ` · ${h.tamano_m2} m²` : ""}
                      </p>

                      <p className="text-xs text-ui-text-secondary">
                        {h.ciudad ? `${h.ciudad} · ` : ""}
                        {h.amueblada ? "Amueblada · " : ""}
                        {h.bano ? "Baño · " : ""}
                        {h.balcon ? "Balcón" : ""}
                      </p>

                      <div className={reputationVisuals.boxClass}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className={reputationVisuals.labelClass}>
                              Ambiente del piso
                            </p>
                            <p className="mt-1 text-xs font-semibold text-ui-text">
                              {reputationVisuals.statusText}
                            </p>
                          </div>

                          <div className={reputationVisuals.bubbleClass}>
                            {convivenciaMedia}
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-ui-text-secondary">
                          {reputationVisuals.helperText}
                        </p>

                        <p className="mt-2 text-xs text-ui-text-secondary">
                          {convivientesActuales} conviviente
                          {convivientesActuales === 1 ? "" : "s"} actual
                          {convivientesActuales === 1 ? "" : "es"}
                          {hasVisibleReputation
                            ? ` · ${convivientesConVotos} valorado${
                                convivientesConVotos === 1 ? "" : "s"
                              }`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ui-text-secondary">
                Página <span className="font-medium text-ui-text">{page}</span> de{" "}
                <span className="font-medium text-ui-text">{totalPages}</span> ·
                Total: <span className="font-medium text-ui-text">{total}</span>
              </p>

              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  disabled={!hasPrev || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </button>

                <button
                  className="btn btn-secondary btn-sm"
                  type="button"
                  disabled={!hasNext || loading}
                  onClick={() => setPage((p) => p + 1)}
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
        onClose={closeFiltersModal}
        size="default"
        closeLabel="Cerrar"
      >
        <div className="space-y-5">
          <FiltersFields
            values={mobileDraftFilters}
            onChange={handleMobileDraftChange}
            isAdmin={isAdmin}
            showSort={false}
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={clearMobileDraftFilters}
            >
              Limpiar
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={applyMobileFilters}
            >
              Aplicar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isSortModalOpen}
        title="Ordenar por"
        onClose={closeSortModal}
        size="md"
        closeLabel="Cerrar"
      >
        <div className="space-y-2">
          {SORT_OPTIONS.map((option) => {
            const isActive = filters.sort === option.value;

            return (
              <button
                key={option.value}
                type="button"
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                  isActive
                    ? "border-brand-primary bg-blue-50 text-brand-primary"
                    : "border-ui-border bg-white text-ui-text hover:bg-slate-50"
                }`}
                onClick={() => applySort(option.value)}
              >
                <span className="text-sm font-medium">{option.label}</span>
                <span
                  className={`ml-3 flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                    isActive
                      ? "border-brand-primary bg-brand-primary text-white"
                      : "border-slate-300 text-transparent"
                  }`}
                >
                  ✓
                </span>
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
}