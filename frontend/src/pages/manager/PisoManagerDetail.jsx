import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import Modal from "../../components/ui/Modal.jsx";
import {
  addAdminPisoFoto,
  deleteAdminPisoFoto,
  getAdminPisoById,
  listAdminHabitacionesByPiso,
  updateAdminPisoFoto,
} from "../../services/adminPisoService.js";
import {
  deactivateAdminHabitacion,
  reactivateAdminHabitacion,
} from "../../services/adminHabitacionService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const EMPTY_PISO_UPLOAD_FORM = {
  foto: null,
  orden: "",
};

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

export default function PisoManagerDetail() {
  const { pisoId } = useParams();

  const [piso, setPiso] = useState(null);
  const [habitaciones, setHabitaciones] = useState([]);
  const [fotosPiso, setFotosPiso] = useState([]);
  const [pisoUploadForm, setPisoUploadForm] = useState(EMPTY_PISO_UPLOAD_FORM);
  const [pisoPhotoOrderValues, setPisoPhotoOrderValues] = useState({});

  const [loading, setLoading] = useState(true);
  const [changingId, setChangingId] = useState(null);
  const [habitacionToDeactivate, setHabitacionToDeactivate] = useState(null);
  const [isDraggingPisoPhoto, setIsDraggingPisoPhoto] = useState(false);
  const [uploadingPisoPhoto, setUploadingPisoPhoto] = useState(false);
  const [updatingPisoPhotoId, setUpdatingPisoPhotoId] = useState(null);
  const [deletingPisoPhotoId, setDeletingPisoPhotoId] = useState(null);
  const [pisoPhotoToDelete, setPisoPhotoToDelete] = useState(null);
  const [pisoPhotoFeedback, setPisoPhotoFeedback] = useState({});
  const [isPisoPhotoModalOpen, setIsPisoPhotoModalOpen] = useState(false);
  const [selectedPisoPhotoIndex, setSelectedPisoPhotoIndex] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const [pisoData, habitacionesData] = await Promise.all([
          getAdminPisoById(pisoId),
          listAdminHabitacionesByPiso(pisoId),
        ]);

        if (!isMounted) return;

        setPiso(pisoData?.piso || null);
        setHabitaciones(Array.isArray(habitacionesData?.items) ? habitacionesData.items : []);
        setFotosPiso(Array.isArray(pisoData?.fotos) ? pisoData.fotos : []);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudo cargar el detalle del piso.");
        setPiso(null);
        setHabitaciones([]);
        setFotosPiso([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [pisoId]);

  useEffect(() => {
    setPisoPhotoOrderValues(
      Object.fromEntries(fotosPiso.map((foto) => [foto.id, String(foto.orden)]))
    );
  }, [fotosPiso]);

  async function handleDeactivateHabitacion(habitacion) {
    const confirmed = window.confirm(
      `¿Seguro que quieres desactivar la habitación "${habitacion.titulo || habitacion.id}"?`
    );

    if (!confirmed) return;

    try {
      setChangingId(habitacion.id);
      setError("");
      setSuccess("");

      const data = await deactivateAdminHabitacion(habitacion.id);
      const updatedHabitacion = data?.habitacion;

      setHabitaciones((prev) =>
        prev.map((item) =>
          item.id === habitacion.id
            ? { ...item, activo: updatedHabitacion?.activo ?? false }
            : item
        )
      );

      setPiso((prev) => {
        if (!prev) return prev;

        const wasActive = Boolean(habitacion.activo);
        const wasAvailableAndActive = Boolean(habitacion.activo && habitacion.disponible);

        return {
          ...prev,
          habitaciones_activas: wasActive
            ? Math.max(0, Number(prev.habitaciones_activas ?? 0) - 1)
            : Number(prev.habitaciones_activas ?? 0),
          habitaciones_disponibles: wasAvailableAndActive
            ? Math.max(0, Number(prev.habitaciones_disponibles ?? 0) - 1)
            : Number(prev.habitaciones_disponibles ?? 0),
        };
      });

      setSuccess("Habitación desactivada correctamente.");
    } catch (err) {
      setError(err?.error || err?.message || "No se pudo desactivar la habitación.");
    } finally {
      setChangingId(null);
    }
  }

  async function handleReactivateHabitacion(habitacion) {
    try {
      setChangingId(habitacion.id);
      setError("");
      setSuccess("");

      const data = await reactivateAdminHabitacion(habitacion.id);
      const updatedHabitacion = data?.habitacion;

      setHabitaciones((prev) =>
        prev.map((item) =>
          item.id === habitacion.id
            ? { ...item, activo: updatedHabitacion?.activo ?? true }
            : item
        )
      );

      setPiso((prev) => {
        if (!prev) return prev;

        const wasInactive = !habitacion.activo;
        const becomesAvailableAndActive = !habitacion.activo && habitacion.disponible;

        return {
          ...prev,
          habitaciones_activas: wasInactive
            ? Number(prev.habitaciones_activas ?? 0) + 1
            : Number(prev.habitaciones_activas ?? 0),
          habitaciones_disponibles: becomesAvailableAndActive
            ? Number(prev.habitaciones_disponibles ?? 0) + 1
            : Number(prev.habitaciones_disponibles ?? 0),
        };
      });

      setSuccess("Habitación reactivada correctamente.");
    } catch (err) {
      setError(err?.error || err?.message || "No se pudo reactivar la habitación.");
    } finally {
      setChangingId(null);
    }
  }

  function requestDeactivateHabitacion(habitacion) {
    setHabitacionToDeactivate(habitacion);
  }

  function closeDeactivateModal() {
    if (changingId) return;
    setHabitacionToDeactivate(null);
  }

  async function handleConfirmDeactivateHabitacion() {
    const habitacion = habitacionToDeactivate;
    if (!habitacion) return;

    try {
      setChangingId(habitacion.id);
      setError("");
      setSuccess("");

      const data = await deactivateAdminHabitacion(habitacion.id);
      const updatedHabitacion = data?.habitacion;

      setHabitaciones((prev) =>
        prev.map((item) =>
          item.id === habitacion.id
            ? { ...item, activo: updatedHabitacion?.activo ?? false }
            : item
        )
      );

      setPiso((prev) => {
        if (!prev) return prev;

        const wasActive = Boolean(habitacion.activo);
        const wasAvailableAndActive = Boolean(habitacion.activo && habitacion.disponible);

        return {
          ...prev,
          habitaciones_activas: wasActive
            ? Math.max(0, Number(prev.habitaciones_activas ?? 0) - 1)
            : Number(prev.habitaciones_activas ?? 0),
          habitaciones_disponibles: wasAvailableAndActive
            ? Math.max(0, Number(prev.habitaciones_disponibles ?? 0) - 1)
            : Number(prev.habitaciones_disponibles ?? 0),
        };
      });

      setSuccess("Habitación desactivada correctamente.");
      setHabitacionToDeactivate(null);
    } catch (err) {
      setError(err?.error || err?.message || "No se pudo desactivar la habitación.");
    } finally {
      setChangingId(null);
    }
  }

  function handlePisoPhotoFileChange(event) {
    const file = event.target.files?.[0] || null;
    setPisoUploadForm((prev) => ({ ...prev, foto: file }));
    uploadPisoPhotoFile(file);
  }

  function handlePisoPhotoOrderChange(event) {
    const { value } = event.target;
    setPisoUploadForm((prev) => ({ ...prev, orden: value }));
  }

  function handlePisoPhotoDragOver(event) {
    event.preventDefault();
    setIsDraggingPisoPhoto(true);
  }

  function handlePisoPhotoDragLeave(event) {
    event.preventDefault();
    setIsDraggingPisoPhoto(false);
  }

  function handlePisoPhotoDrop(event) {
    event.preventDefault();
    setIsDraggingPisoPhoto(false);

    const file = event.dataTransfer?.files?.[0] || null;
    if (!file) return;

    setPisoUploadForm((prev) => ({ ...prev, foto: file }));
    uploadPisoPhotoFile(file);
  }

  function openPisoPhotoModal(index) {
    setSelectedPisoPhotoIndex(index);
    setIsPisoPhotoModalOpen(true);
  }

  function closePisoPhotoModal() {
    setIsPisoPhotoModalOpen(false);
  }

  function showPrevPisoPhoto() {
    setSelectedPisoPhotoIndex((prev) =>
      prev === 0 ? fotosPiso.length - 1 : prev - 1
    );
  }

  function showNextPisoPhoto() {
    setSelectedPisoPhotoIndex((prev) =>
      prev === fotosPiso.length - 1 ? 0 : prev + 1
    );
  }

  async function uploadPisoPhotoFile(file) {
    if (!file) return;

    try {
      setUploadingPisoPhoto(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("foto", file);

      if (pisoUploadForm.orden !== "") {
        formData.append("orden", pisoUploadForm.orden);
      }

      const data = await addAdminPisoFoto(pisoId, formData);
      const nuevaFoto = data?.foto || null;

      if (nuevaFoto) {
        setFotosPiso((prev) =>
          [...prev, nuevaFoto].sort((a, b) => {
            if (a.orden !== b.orden) return a.orden - b.orden;
            return a.id - b.id;
          })
        );
      }

      setPisoUploadForm(EMPTY_PISO_UPLOAD_FORM);
      setSuccess("Foto del piso subida correctamente.");
    } catch (err) {
      setError(err?.error || err?.message || "No se pudo subir la foto del piso.");
    } finally {
      setUploadingPisoPhoto(false);
    }
  }

  function handlePisoPhotoOrderValueChange(fotoId, value) {
    setPisoPhotoOrderValues((prev) => ({
      ...prev,
      [fotoId]: value,
    }));

    setPisoPhotoFeedback((prev) => {
      const next = { ...prev };
      delete next[fotoId];
      return next;
    });
  }

  async function handleSavePisoPhotoOrder(foto) {
    const rawValue = pisoPhotoOrderValues[foto.id];
    const nextOrder = Number(rawValue);

    if (!Number.isInteger(nextOrder) || nextOrder < 0) {
      setPisoPhotoFeedback((prev) => ({
        ...prev,
        [foto.id]: {
          type: "error",
          message: "El orden debe ser un número entero mayor o igual que 0.",
        },
      }));
      return;
    }

    try {
      setUpdatingPisoPhotoId(foto.id);
      setError("");

      const data = await updateAdminPisoFoto(pisoId, foto.id, {
        orden: nextOrder,
      });

      const updatedFoto = data?.foto || null;
      if (!updatedFoto) return;

      setFotosPiso((prev) =>
        prev
          .map((item) => (item.id === foto.id ? updatedFoto : item))
          .sort((a, b) => {
            if (a.orden !== b.orden) return a.orden - b.orden;
            return a.id - b.id;
          })
      );

      setPisoPhotoFeedback((prev) => ({
        ...prev,
        [foto.id]: {
          type: "success",
          message: "Orden de foto actualizado correctamente.",
        },
      }));
    } catch (err) {
      const friendlyMessage =
        err?.error === "ORDER_CONFLICT"
          ? "Ya existe otra foto con ese orden. Prueba con otro número distinto."
          : err?.message || "No se pudo actualizar el orden de la foto.";

      setPisoPhotoFeedback((prev) => ({
        ...prev,
        [foto.id]: {
          type: "error",
          message: friendlyMessage,
        },
      }));
    } finally {
      setUpdatingPisoPhotoId(null);
    }
  }

  function requestDeletePisoPhoto(foto) {
    setPisoPhotoToDelete(foto);
  }

  function closeDeletePisoPhotoModal() {
    if (deletingPisoPhotoId) return;
    setPisoPhotoToDelete(null);
  }

  async function handleConfirmDeletePisoPhoto() {
    if (!pisoPhotoToDelete) return;

    try {
      setDeletingPisoPhotoId(pisoPhotoToDelete.id);
      setError("");
      setSuccess("");

      await deleteAdminPisoFoto(pisoId, pisoPhotoToDelete.id);

      setFotosPiso((prev) => prev.filter((foto) => foto.id !== pisoPhotoToDelete.id));
      setPisoPhotoToDelete(null);
      setSuccess("Foto del piso eliminada correctamente.");
    } catch (err) {
      setError(err?.error || err?.message || "No se pudo eliminar la foto del piso.");
    } finally {
      setDeletingPisoPhotoId(null);
    }
  }

  const cover = buildImageUrl(piso?.cover_foto_piso_url);

  return (
    <>
      <PageShell
        title="Detalle del piso"
        subtitle="Consulta información del piso, sus fotos y sus habitaciones."
        variant="plain"
        contentClassName="space-y-6"
        actions={
          <Link to="/manager" className="btn btn-secondary btn-sm">
            Volver
          </Link>
        }
      >
        {error ? <div className="alert-error">{error}</div> : null}
        {success ? <div className="alert-success">{success}</div> : null}

        {loading ? (
          <div className="space-y-4">
            <div className="card">
              <div className="card-body space-y-4">
                <div className="skeleton aspect-[16/6] w-full" />
                <div className="skeleton h-6 w-1/3" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="skeleton h-24 w-full" />
              <div className="skeleton h-24 w-full" />
              <div className="skeleton h-24 w-full" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="card">
                  <div className="card-body space-y-3">
                    <div className="skeleton aspect-[4/3] w-full" />
                    <div className="skeleton h-5 w-2/3" />
                    <div className="skeleton h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : piso ? (
          <>
            <div className="card">
              <div className="card-body space-y-4">
                {cover ? (
                  <button
                    type="button"
                    className="block w-full"
                    onClick={() => openPisoPhotoModal(0)}
                  >
                    <img
                      src={cover}
                      alt={piso.direccion || `Piso ${piso.id}`}
                      className="aspect-[16/6] w-full rounded-lg object-cover"
                    />
                  </button>
                ) : (
                  <div className="skeleton aspect-[16/6] w-full rounded-lg" />
                )}

                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-ui-text">
                      {piso.direccion || "Sin dirección"}
                    </h2>

                    <p className="text-sm text-ui-text-secondary">
                      {piso.ciudad || "—"}
                      {piso.codigo_postal ? ` · ${piso.codigo_postal}` : ""}
                    </p>
                  </div>

                  <span className={piso.activo ? "badge badge-success" : "badge badge-neutral"}>
                    {piso.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <p className="text-sm text-ui-text-secondary">
                  {piso.descripcion || "Sin descripción."}
                </p>
              </div>
            </div>

            <section className="space-y-4 rounded-2xl border border-slate-300 bg-white p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                  Fotos del piso
                </h3>
                <span className="text-xs text-ui-text-secondary">Total: {fotosPiso.length}</span>
              </div>

              <div className="card">
                <div className="card-body space-y-4">
                  <div>
                    <h4 className="text-base font-semibold text-ui-text">Añadir foto del piso</h4>
                    <p className="mt-1 text-sm text-ui-text-secondary">
                      Selecciona o arrastra una imagen para subirla a este piso.
                    </p>
                  </div>

                  {uploadingPisoPhoto ? (
                    <div className="flex justify-end">
                      <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
                        Subiendo foto del piso...
                      </div>
                    </div>
                  ) : null}

                  <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <label
                      htmlFor="foto-piso"
                      onDragOver={handlePisoPhotoDragOver}
                      onDragLeave={handlePisoPhotoDragLeave}
                      onDrop={handlePisoPhotoDrop}
                      className={`flex min-h-[160px] cursor-pointer items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
                        isDraggingPisoPhoto
                          ? "border-brand-primary bg-blue-50"
                          : "border-ui-border bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-ui-text">
                          {pisoUploadForm.foto
                            ? pisoUploadForm.foto.name
                            : "Haz clic o arrastra una foto aquí"}
                        </p>
                        <p className="text-xs text-ui-text-secondary">
                          JPG, PNG u otros formatos de imagen · máximo 8 MB
                        </p>
                      </div>
                    </label>

                    <input
                      id="foto-piso"
                      name="foto"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePisoPhotoFileChange}
                      disabled={uploadingPisoPhoto}
                    />

                    <div className="max-w-[220px]">
                      <label className="label" htmlFor="orden-piso">
                        Orden (opcional)
                      </label>
                      <input
                        id="orden-piso"
                        name="orden"
                        type="number"
                        min="0"
                        className="input"
                        value={pisoUploadForm.orden}
                        onChange={handlePisoPhotoOrderChange}
                        disabled={uploadingPisoPhoto}
                      />
                    </div>
                  </form>
                </div>
              </div>

              {fotosPiso.length === 0 ? (
                <div className="card">
                  <div className="card-body">
                    <p className="text-sm text-ui-text-secondary">
                      Este piso todavía no tiene fotos.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {fotosPiso.map((foto) => (
                    <article key={foto.id} className="card">
                      <div className="card-body space-y-3">
                        <img
                          src={buildImageUrl(foto.url)}
                          alt={`Foto del piso ${foto.orden}`}
                          className="aspect-[4/3] w-full rounded-md object-cover"
                        />

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-ui-text-secondary">ID #{foto.id}</span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="label" htmlFor={`orden-piso-foto-${foto.id}`}>
                              Orden
                            </label>
                            <input
                              id={`orden-piso-foto-${foto.id}`}
                              type="number"
                              min="0"
                              className="input"
                              value={pisoPhotoOrderValues[foto.id] ?? ""}
                              onChange={(event) =>
                                handlePisoPhotoOrderValueChange(foto.id, event.target.value)
                              }
                              disabled={
                                updatingPisoPhotoId === foto.id || deletingPisoPhotoId === foto.id
                              }
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="btn btn-sm border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              disabled={
                                updatingPisoPhotoId === foto.id || deletingPisoPhotoId === foto.id
                              }
                              onClick={() => handleSavePisoPhotoOrder(foto)}
                            >
                              {updatingPisoPhotoId === foto.id ? "Guardando..." : "Guardar orden"}
                            </button>

                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              disabled={
                                deletingPisoPhotoId === foto.id || updatingPisoPhotoId === foto.id
                              }
                              onClick={() => requestDeletePisoPhoto(foto)}
                            >
                              {deletingPisoPhotoId === foto.id ? "Eliminando..." : "Eliminar foto"}
                            </button>
                          </div>

                          {pisoPhotoFeedback[foto.id] ? (
                            <div
                              className={
                                pisoPhotoFeedback[foto.id].type === "success"
                                  ? "alert-success"
                                  : "alert-error"
                              }
                            >
                              {pisoPhotoFeedback[foto.id].message}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>            

            <section className="space-y-4 rounded-2xl border border-slate-300 bg-white p-4 md:p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">Habitaciones del piso</h3>
                <span className="text-xs text-ui-text-secondary">
                  Total cargadas: {habitaciones.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-amber-300 bg-amber-50">
                <div className="card-body">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                    Habitaciones totales
                  </p>
                  <p className="mt-2 text-2xl font-bold text-ui-text">
                    {piso.habitaciones_total ?? 0}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-300 bg-emerald-50">
                <div className="card-body">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                    Habitaciones activas
                  </p>
                  <p className="mt-2 text-2xl font-bold text-ui-text">
                    {piso.habitaciones_activas ?? 0}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-sky-300 bg-sky-50">
                <div className="card-body">
                  <p className="text-xs font-medium uppercase tracking-wide text-sky-600">
                    Habitaciones disponibles
                  </p>
                  <p className="mt-2 text-2xl font-bold text-ui-text">
                    {piso.habitaciones_disponibles ?? 0}
                  </p>
                </div>
              </div>
            </div>

              {habitaciones.length === 0 ? (
                <div className="rounded-xl border border-slate-300 bg-slate-50">
                  <div className="card-body">
                    <p className="text-sm text-ui-text-secondary">
                      Este piso todavía no tiene habitaciones.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {habitaciones.map((habitacion) => {
                    const roomCover = buildImageUrl(habitacion.cover_foto_habitacion_url);
                    const isInactive = !habitacion.activo;

                    return (
                      <article
                        key={habitacion.id}
                        className={`card flex h-full flex-col transition-opacity ${
                          isInactive ? "opacity-45" : ""
                        }`}
                      >
                        <div className="card-body flex flex-1 flex-col gap-3">
                          {roomCover ? (
                            <img
                              src={roomCover}
                              alt={habitacion.titulo || `Habitación ${habitacion.id}`}
                              className="aspect-[4/3] w-full rounded-md object-cover"
                            />
                          ) : (
                            <div className="skeleton aspect-[4/3] w-full rounded-md" />
                          )}

                          <div className="flex items-start justify-between gap-2">
                            <h4 className="min-h-[56px] text-base font-semibold text-ui-text">
                              {habitacion.titulo || "Sin título"}
                            </h4>

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
                                  habitacion.disponible
                                    ? "badge badge-info"
                                    : "badge badge-warning"
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

                          <p className="text-xs text-ui-text-secondary">
                            {habitacion.amueblada ? "Amueblada · " : ""}
                            {habitacion.bano ? "Baño · " : ""}
                            {habitacion.balcon ? "Balcón" : ""}
                          </p>

                          <div className="mt-auto flex items-center justify-end gap-2 pt-1">
                            <Link
                              to={`/manager/habitacion/${habitacion.id}`}
                              className="btn btn-sm border border-blue-300 bg-blue-100 text-brand-primary hover:bg-blue-200"
                            >
                              Gestionar
                            </Link>

                            {habitacion.activo ? (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={changingId === habitacion.id}
                                onClick={() => requestDeactivateHabitacion(habitacion)}
                              >
                                {changingId === habitacion.id ? "Desactivando..." : "Desactivar"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={changingId === habitacion.id}
                                onClick={() => handleReactivateHabitacion(habitacion)}
                              >
                                {changingId === habitacion.id ? "Reactivando..." : "Reactivar"}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}
      </PageShell>

      <Modal
        open={Boolean(habitacionToDeactivate)}
        title="Confirmar desactivación"
        onClose={closeDeactivateModal}
        size="md"
        tone="danger"
        closeLabel="Cancelar"
        closeOnOverlay={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-ui-text-secondary">
            Vas a desactivar esta habitación y dejará de estar disponible en la parte pública.
          </p>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              {habitacionToDeactivate?.titulo || "Habitación sin título"}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeDeactivateModal}
              disabled={Boolean(changingId)}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleConfirmDeactivateHabitacion}
              disabled={Boolean(changingId)}
            >
              {changingId ? "Desactivando..." : "Sí, desactivar"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isPisoPhotoModalOpen}
        title="Foto del piso"
        onClose={closePisoPhotoModal}
        size="default"
        closeLabel="Cerrar"
      >
        {fotosPiso.length > 0 ? (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={buildImageUrl(fotosPiso[selectedPisoPhotoIndex]?.url)}
                alt={`Foto ${selectedPisoPhotoIndex + 1}`}
                className="max-h-[80vh] w-full rounded-lg object-contain"
              />

              {fotosPiso.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-ui-border bg-white/90 px-3 py-2 text-lg font-semibold text-ui-text shadow"
                    onClick={showPrevPisoPhoto}
                  >
                    &lt;
                  </button>
              
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-ui-border bg-white/90 px-3 py-2 text-lg font-semibold text-ui-text shadow"
                    onClick={showNextPisoPhoto}
                  >
                    &gt;
                  </button>
                </>
              ) : null}
            </div>
            
            <div className="text-center text-sm text-ui-text-secondary">
              Foto {selectedPisoPhotoIndex + 1} de {fotosPiso.length}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}