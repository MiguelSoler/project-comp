import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { getApiErrorMessage } from "../../services/apiClient.js";
import {
  createAdminPiso,
  deactivateAdminPiso,
  listAdminPisos,
  reactivateAdminPiso,
} from "../../services/adminPisoService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const EMPTY_PISO_FORM = {
  direccion: "",
  ciudad: "",
  codigo_postal: "",
  descripcion: "",
};

function buildImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatConvivientesLabel(count) {
  const n = Number(count || 0);
  if (n === 1) return "1 conviviente";
  return `${n} convivientes`;
}

function getConvivenciaTone(avg, count, totalVotes) {
  const media = toNullableNumber(avg);
  const convivientes = Number(count || 0);
  const votos = Number(totalVotes || 0);

  if (convivientes === 0) {
    return {
      wrapper: "rounded-lg border border-slate-200 bg-slate-50 p-3",
      label: "text-xs font-medium uppercase tracking-wide text-slate-500",
      value: "mt-1 text-sm font-semibold text-ui-text",
      meta: "mt-1 text-xs text-ui-text-secondary",
      title: "Sin convivientes actuales",
      subtitle: "Todavía no hay ocupación activa en este piso.",
    };
  }

  if (media === null || votos === 0) {
    return {
      wrapper: "rounded-lg border border-sky-200 bg-sky-50 p-3",
      label: "text-xs font-medium uppercase tracking-wide text-sky-700",
      value: "mt-1 text-sm font-semibold text-ui-text",
      meta: "mt-1 text-xs text-ui-text-secondary",
      title: "Convivencia actual sin datos",
      subtitle: formatConvivientesLabel(convivientes),
    };
  }

  if (media >= 4) {
    return {
      wrapper: "rounded-lg border border-emerald-200 bg-emerald-50 p-3",
      label: "text-xs font-medium uppercase tracking-wide text-emerald-700",
      value: "mt-1 text-sm font-semibold text-ui-text",
      meta: "mt-1 text-xs text-ui-text-secondary",
      title: `Convivencia actual · ${media.toFixed(1)}/5`,
      subtitle: `${formatConvivientesLabel(convivientes)} · ${votos} votos`,
    };
  }

  if (media >= 3) {
    return {
      wrapper: "rounded-lg border border-amber-200 bg-amber-50 p-3",
      label: "text-xs font-medium uppercase tracking-wide text-amber-700",
      value: "mt-1 text-sm font-semibold text-ui-text",
      meta: "mt-1 text-xs text-ui-text-secondary",
      title: `Convivencia actual · ${media.toFixed(1)}/5`,
      subtitle: `${formatConvivientesLabel(convivientes)} · ${votos} votos`,
    };
  }

  return {
    wrapper: "rounded-lg border border-red-200 bg-red-50 p-3",
    label: "text-xs font-medium uppercase tracking-wide text-red-700",
    value: "mt-1 text-sm font-semibold text-ui-text",
    meta: "mt-1 text-xs text-ui-text-secondary",
    title: `Convivencia actual · ${media.toFixed(1)}/5`,
    subtitle: `${formatConvivientesLabel(convivientes)} · ${votos} votos`,
  };
}

export default function DashboardManager() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [pisoForm, setPisoForm] = useState(EMPTY_PISO_FORM);
  const [creatingPiso, setCreatingPiso] = useState(false);
  const [isCreatePisoOpen, setIsCreatePisoOpen] = useState(false);
  const [createPisoFeedback, setCreatePisoFeedback] = useState(null);

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

        const data = await listAdminPisos({ page, limit });

        if (!isMounted) return;

        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotalPages(Number(data?.totalPages || 1));
        setTotal(Number(data?.total || 0));
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudieron cargar tus pisos.");
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
  }, [page, limit, reloadKey]);

  function handlePisoFormChange(event) {
    const { name, value } = event.target;
    setPisoForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetCreatePisoForm() {
    setPisoForm(EMPTY_PISO_FORM);
  }

  function openCreatePisoForm() {
    setCreatePisoFeedback(null);
    setIsCreatePisoOpen(true);
  }

  function closeCreatePisoForm() {
    if (creatingPiso) return;
    resetCreatePisoForm();
    setCreatePisoFeedback(null);
    setIsCreatePisoOpen(false);
  }

  async function handleCreatePiso(event) {
    event.preventDefault();

    try {
      setCreatingPiso(true);
      setCreatePisoFeedback(null);

      const payload = {
        direccion: pisoForm.direccion.trim(),
        ciudad: pisoForm.ciudad.trim(),
        codigo_postal: pisoForm.codigo_postal.trim() || null,
        descripcion: pisoForm.descripcion.trim() || null,
      };

      const data = await createAdminPiso(payload);
      const nuevoPiso = data?.piso || null;

      if (!nuevoPiso) {
        throw new Error("No se pudo crear el piso.");
      }

      resetCreatePisoForm();
      setIsCreatePisoOpen(false);
      setCreatePisoFeedback({
        type: "success",
        message: "Piso creado correctamente.",
      });

      if (page !== 1) {
        setPage(1);
      } else {
        setReloadKey((prev) => prev + 1);
      }
    } catch (err) {
      setCreatePisoFeedback({
        type: "error",
        message: getApiErrorMessage(err, "No se pudo crear el piso."),
      });
    } finally {
      setCreatingPiso(false);
    }
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
    const piso = pisoActionTarget;
    const actionType = pisoActionType;

    if (!piso || !actionType) return;

    try {
      setChangingPisoId(piso.id);
      setError("");

      setPisoCardFeedback((prev) => {
        const next = { ...prev };
        delete next[piso.id];
        return next;
      });

      if (actionType === "deactivate") {
        await deactivateAdminPiso(piso.id);
      } else {
        await reactivateAdminPiso(piso.id);
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === piso.id
            ? {
                ...item,
                activo: actionType === "reactivate",
              }
            : item
        )
      );

      setPisoCardFeedback((prev) => ({
        ...prev,
        [piso.id]: {
          type: "success",
          message:
            actionType === "deactivate"
              ? "Piso desactivado correctamente."
              : "Piso reactivado correctamente.",
        },
      }));

      setPisoActionTarget(null);
      setPisoActionType("");
    } catch (err) {
      const message =
        err?.error === "PISO_HAS_ACTIVE_OCCUPANTS"
          ? "No puedes desactivar este piso mientras tenga convivientes activos."
          : getApiErrorMessage(
            err,
            actionType === "deactivate"
              ? "No se pudo desactivar el piso."
              : "No se pudo reactivar el piso."
          );

      setPisoCardFeedback((prev) => ({
        ...prev,
        [piso.id]: {
          type: "error",
          message,
        },
      }));

      setError(message);
      setPisoActionTarget(null);
      setPisoActionType("");
    } finally {
      setChangingPisoId(null);
    }
  }

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <>
      <PageShell
        title="Panel Manager"
        subtitle={`Gestiona tus pisos publicados. Total: ${total}`}
        variant="plain"
        contentClassName="space-y-4"
        actions={
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
        }
      >
        {error ? <div className="alert-error">{error}</div> : null}

        {createPisoFeedback ? (
          <div
            className={
              createPisoFeedback.type === "success" ? "alert-success" : "alert-error"
            }
          >
            {createPisoFeedback.message}
          </div>
        ) : null}

        <div className="space-y-4">
          {!isCreatePisoOpen ? (
            <div className="flex justify-start">
              <button
                type="button"
                className="btn btn-primary"
                onClick={openCreatePisoForm}
              >
                Añadir piso
              </button>
            </div>
          ) : null}

          <div
            className={`overflow-hidden transition-all duration-500 ease-out ${
              isCreatePisoOpen
                ? "mt-4 max-h-[520px] translate-y-0 opacity-100"
                : "max-h-0 -translate-y-3 opacity-0 pointer-events-none"
            }`}
          >
            <div className="card">
              <div className="card-body space-y-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                    Nuevo piso
                  </h3>
                  <p className="mt-1 text-sm text-ui-text-secondary">
                    Completa los datos para crear un nuevo piso.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleCreatePiso}>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="label" htmlFor="direccion">
                        Dirección
                      </label>
                      <input
                        id="direccion"
                        name="direccion"
                        type="text"
                        className="input"
                        value={pisoForm.direccion}
                        onChange={handlePisoFormChange}
                        disabled={creatingPiso}
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="ciudad">
                        Ciudad
                      </label>
                      <input
                        id="ciudad"
                        name="ciudad"
                        type="text"
                        className="input"
                        value={pisoForm.ciudad}
                        onChange={handlePisoFormChange}
                        disabled={creatingPiso}
                      />
                    </div>

                    <div>
                      <label className="label" htmlFor="codigo_postal">
                        Código postal
                      </label>
                      <input
                        id="codigo_postal"
                        name="codigo_postal"
                        type="text"
                        className="input"
                        value={pisoForm.codigo_postal}
                        onChange={handlePisoFormChange}
                        disabled={creatingPiso}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="label" htmlFor="descripcion">
                        Descripción
                      </label>
                      <textarea
                        id="descripcion"
                        name="descripcion"
                        className="textarea"
                        value={pisoForm.descripcion}
                        onChange={handlePisoFormChange}
                        disabled={creatingPiso}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="btn border border-rose-300 bg-rose-100 text-rose-800 hover:bg-rose-200"
                      onClick={closeCreatePisoForm}
                      disabled={creatingPiso}
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      className="btn border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200"
                      onClick={resetCreatePisoForm}
                      disabled={creatingPiso}
                    >
                      Limpiar
                    </button>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={creatingPiso}
                      aria-busy={creatingPiso}
                    >
                      {creatingPiso ? "Creando..." : "Crear piso"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
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
                Todavía no tienes pisos creados.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                        className="absolute right-3 top-12 z-30 min-w-[180px] rounded-lg border border-ui-border bg-white p-2 shadow-modal"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {piso.activo ? (
                          <button
                            type="button"
                            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ui-text hover:bg-red-100"
                            onClick={(event) => openPisoActionModal(piso, "deactivate", event)}
                          >
                            Desactivar piso
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ui-text hover:bg-green-100"
                            onClick={(event) => openPisoActionModal(piso, "reactivate", event)}
                          >
                            Reactivar piso
                          </button>
                        )}
                      </div>
                    ) : null}

                    <div
                      role="button"
                      tabIndex={0}
                      className={`card-body space-y-3 ${
                        !piso.activo ? "opacity-25" : ""
                      }`}
                      onClick={() => {
                        setOpenMenuPisoId(null);
                        navigate(`/manager/piso/${piso.id}`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setOpenMenuPisoId(null);
                          navigate(`/manager/piso/${piso.id}`);
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

                      {(() => {
                        const convivencia = getConvivenciaTone(
                          piso.reputacion_actual_media,
                          piso.convivientes_actuales_count,
                          piso.reputacion_actual_total_votos
                        );
                      
                        return (
                          <div className={convivencia.wrapper}>
                            <p className={convivencia.label}>Resumen convivencia</p>
                            <p className={convivencia.value}>{convivencia.title}</p>
                            <p className={convivencia.meta}>{convivencia.subtitle}</p>
                          </div>
                        );
                      })()}

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

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ui-text-secondary">
                Página <span className="font-medium text-ui-text">{page}</span> de{" "}
                <span className="font-medium text-ui-text">{totalPages}</span>
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
