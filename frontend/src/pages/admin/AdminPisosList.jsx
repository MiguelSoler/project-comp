import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import PageShell from "../../components/layout/PageShell.jsx";
import Modal from "../../components/ui/Modal.jsx";
import {
  deactivateAdminPiso,
  listAdminPisos,
  reactivateAdminPiso,
} from "../../services/adminPisoService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function buildImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function formatManagerName(piso) {
  const nombre = piso?.manager?.nombre || "";
  const apellidos = piso?.manager?.apellidos || "";
  return `${nombre} ${apellidos}`.trim() || "Sin manager";
}

export default function AdminPisosList() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(9);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [ciudad, setCiudad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activoFilter, setActivoFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const [openMenuPisoId, setOpenMenuPisoId] = useState(null);
  const [pisoActionTarget, setPisoActionTarget] = useState(null);
  const [pisoActionType, setPisoActionType] = useState("");
  const [changingPisoId, setChangingPisoId] = useState(null);
  const [pisoCardFeedback, setPisoCardFeedback] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPisos() {
      try {
        setLoading(true);
        setError("");

        const data = await listAdminPisos({
          page,
          limit,
          ciudad: ciudad.trim() || undefined,
          direccion: direccion.trim() || undefined,
          codigo_postal: codigoPostal.trim() || undefined,
          descripcion: descripcion.trim() || undefined,
          activo: activoFilter,
          sort,
        });

        if (!isMounted) return;

        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotalPages(Number(data?.totalPages || 1));
        setTotal(Number(data?.total || 0));
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudieron cargar los pisos.");
        setItems([]);
        setTotalPages(1);
        setTotal(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPisos();

    return () => {
      isMounted = false;
    };
  }, [page, limit, ciudad, direccion, codigoPostal, descripcion, activoFilter, sort, reloadKey]);

  function handleClearFilters() {
    setCiudad("");
    setDireccion("");
    setCodigoPostal("");
    setDescripcion("");
    setActivoFilter("all");
    setSort("newest");
    setPage(1);
    setOpenMenuPisoId(null);
  }

  function togglePisoMenu(pisoId, event) {
    event.stopPropagation();
    setOpenMenuPisoId((prev) => (prev === pisoId ? null : pisoId));
  }

  function openPisoActionModal(piso, actionType, event) {
    event.stopPropagation();
    setOpenMenuPisoId(null);
    setPisoActionTarget(piso);
    setPisoActionType(actionType);
  }

  function closePisoActionModal() {
    if (changingPisoId) return;
    setPisoActionTarget(null);
    setPisoActionType("");
  }

  async function handleConfirmPisoAction() {
    if (!pisoActionTarget || !pisoActionType) return;

    try {
      setChangingPisoId(pisoActionTarget.id);
      setError("");

      setPisoCardFeedback((prev) => {
        const next = { ...prev };
        delete next[pisoActionTarget.id];
        return next;
      });

      if (pisoActionType === "deactivate") {
        await deactivateAdminPiso(pisoActionTarget.id);
      } else {
        await reactivateAdminPiso(pisoActionTarget.id);
      }

      if (activoFilter === "all") {
        setItems((prev) =>
          prev.map((item) =>
            item.id === pisoActionTarget.id
              ? {
                  ...item,
                  activo: pisoActionType === "reactivate",
                }
              : item
          )
        );
      } else {
        setReloadKey((prev) => prev + 1);
      }

      setPisoCardFeedback((prev) => ({
        ...prev,
        [pisoActionTarget.id]: {
          type: "success",
          message:
            pisoActionType === "deactivate"
              ? "Piso desactivado correctamente."
              : "Piso reactivado correctamente.",
        },
      }));

      setPisoActionTarget(null);
      setPisoActionType("");
    } catch (err) {
      setPisoCardFeedback((prev) => ({
        ...prev,
        [pisoActionTarget.id]: {
          type: "error",
          message:
            err?.error ||
            err?.message ||
            (pisoActionType === "deactivate"
              ? "No se pudo desactivar el piso."
              : "No se pudo reactivar el piso."),
        },
      }));
    } finally {
      setChangingPisoId(null);
    }
  }

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <>
      <PageShell
        title="Listado de pisos"
        subtitle={`Gestiona todos los pisos de la plataforma. Total: ${total}`}
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
                <label className="label" htmlFor="admin-pisos-ciudad">
                  Ciudad
                </label>
                <input
                  id="admin-pisos-ciudad"
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
                <label className="label" htmlFor="admin-pisos-direccion">
                  Dirección
                </label>
                <input
                  id="admin-pisos-direccion"
                  type="text"
                  className="input"
                  placeholder="Buscar por dirección"
                  value={direccion}
                  onChange={(event) => {
                    setDireccion(event.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div>
                <label className="label" htmlFor="admin-pisos-codigo-postal">
                  Código postal
                </label>
                <input
                  id="admin-pisos-codigo-postal"
                  type="text"
                  className="input"
                  placeholder="Ej. 28001"
                  value={codigoPostal}
                  onChange={(event) => {
                    setCodigoPostal(event.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <label className="label" htmlFor="admin-pisos-descripcion">
                  Descripción
                </label>
                <input
                  id="admin-pisos-descripcion"
                  type="text"
                  className="input"
                  placeholder="Buscar en la descripción"
                  value={descripcion}
                  onChange={(event) => {
                    setDescripcion(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="label" htmlFor="admin-pisos-activo">
                  Estado
                </label>
                <select
                  id="admin-pisos-activo"
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

              <div>
                <label className="label" htmlFor="admin-pisos-sort">
                  Ordenar por
                </label>
                <select
                  id="admin-pisos-sort"
                  className="select"
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
                No hay pisos para los filtros seleccionados.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((piso) => {
                const cover = buildImageUrl(piso.cover_foto_piso_url);

                return (
                  <article
                    key={piso.id}
                    className="card card-hover relative"
                  >
                    <button
                      type="button"
                      className="absolute right-[10px] top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-sky-300 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white shadow-[0_0_0_3px_rgba(96,165,250,0.35)] transition-all hover:from-sky-500 hover:via-blue-600 hover:to-indigo-700 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.4)]"
                      onClick={(event) => togglePisoMenu(piso.id, event)}
                      aria-label="Más acciones"
                    >
                      <span className="flex items-center justify-center gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-white" />
                        <span className="h-1 w-1 rounded-full bg-white" />
                        <span className="h-1 w-1 rounded-full bg-white" />
                      </span>
                    </button>

                    {openMenuPisoId === piso.id ? (
                      <div
                        className="absolute right-3 top-12 z-30 min-w-[190px] rounded-lg border border-ui-border bg-white p-2 shadow-modal"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {piso.activo ? (
                          <button
                            type="button"
                            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ui-text hover:bg-red-100"
                            onClick={(event) =>
                              openPisoActionModal(piso, "deactivate", event)
                            }
                          >
                            Desactivar piso
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ui-text hover:bg-green-100"
                            onClick={(event) =>
                              openPisoActionModal(piso, "reactivate", event)
                            }
                          >
                            Reactivar piso
                          </button>
                        )}
                      </div>
                    ) : null}

                    <div
                      role="button"
                      tabIndex={0}
                      className={`card-body space-y-3 ${!piso.activo ? "opacity-45" : ""}`}
                      onClick={() => {
                        setOpenMenuPisoId(null);
                        navigate(`/admin/piso/${piso.id}`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setOpenMenuPisoId(null);
                          navigate(`/admin/piso/${piso.id}`);
                        }
                      }}
                    >
                      {cover ? (
                        <img
                          src={cover}
                          alt={piso.direccion || `Piso ${piso.id}`}
                          className="aspect-[4/3] w-full rounded-md object-cover"
                        />
                      ) : (
                        <div className="skeleton aspect-[4/3] w-full" />
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-base font-semibold text-ui-text">
                          {piso.direccion || "Sin dirección"}
                        </h2>

                        <span
                          className={piso.activo ? "badge badge-success" : "badge badge-neutral"}
                        >
                          {piso.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>

                      <p className="text-sm text-ui-text-secondary">
                        {piso.ciudad || "—"}
                        {piso.codigo_postal ? ` · ${piso.codigo_postal}` : ""}
                      </p>

                      <p className="text-xs text-ui-text-secondary">
                        Manager:{" "}
                        <span className="font-medium text-ui-text">
                          {formatManagerName(piso)}
                        </span>
                      </p>

                      <p className="text-sm text-ui-text-secondary line-clamp-3">
                        {piso.descripcion || "Sin descripción."}
                      </p>
                    </div>

                    {pisoCardFeedback[piso.id] ? (
                      <div
                        className={`mx-4 mb-4 ${
                          pisoCardFeedback[piso.id].type === "success"
                            ? "alert-success"
                            : "alert-error"
                        }`}
                      >
                        {pisoCardFeedback[piso.id].message}
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
        open={Boolean(pisoActionTarget)}
        title={pisoActionType === "reactivate" ? "Confirmar reactivación" : "Confirmar desactivación"}
        onClose={closePisoActionModal}
        size="md"
        tone={pisoActionType === "reactivate" ? "default" : "danger"}
        closeLabel="Cancelar"
        closeOnOverlay={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-ui-text-secondary">
            {pisoActionType === "reactivate"
              ? "Vas a reactivar este piso para que vuelva a estar operativo."
              : "Vas a desactivar este piso."}
          </p>

          <div
            className={
              pisoActionType === "reactivate"
                ? "rounded-lg border border-emerald-200 bg-emerald-50 p-4"
                : "rounded-lg border border-red-200 bg-red-50 p-4"
            }
          >
            <p
              className={
                pisoActionType === "reactivate"
                  ? "text-sm font-semibold text-emerald-700"
                  : "text-sm font-semibold text-red-700"
              }
            >
              {pisoActionTarget?.direccion || "Piso sin dirección"}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closePisoActionModal}
              disabled={Boolean(changingPisoId)}
            >
              Cancelar
            </button>

            <button
              type="button"
              className={
                pisoActionType === "reactivate"
                  ? "btn btn-sm border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                  : "btn btn-danger btn-sm"
              }
              onClick={handleConfirmPisoAction}
              disabled={Boolean(changingPisoId)}
            >
              {changingPisoId
                ? pisoActionType === "reactivate"
                  ? "Reactivando..."
                  : "Desactivando..."
                : pisoActionType === "reactivate"
                  ? "Sí, reactivar"
                  : "Sí, desactivar"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}