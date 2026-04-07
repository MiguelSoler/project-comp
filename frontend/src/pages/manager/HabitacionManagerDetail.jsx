import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import Modal from "../../components/ui/Modal.jsx";
import {
  addAdminHabitacionFoto,
  deleteAdminHabitacionFoto,
  getAdminHabitacionById,
  updateAdminHabitacion,
  updateAdminHabitacionFoto,
} from "../../services/adminHabitacionService.js";
import {
  kickFromHabitacion,
  joinHabitacion,
  listConvivientesByPiso,
  searchAssignableUserByEmail,
} from "../../services/usuarioHabitacionService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const EMPTY_FORM = {
  titulo: "",
  descripcion: "",
  precio_mensual: "",
  disponible: "true",
  tamano_m2: "",
  amueblada: "false",
  bano: "false",
  balcon: "false",
};

const EMPTY_UPLOAD_FORM = {
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

function buildFormFromHabitacion(habitacion) {
  if (!habitacion) return EMPTY_FORM;

  return {
    titulo: habitacion.titulo || "",
    descripcion: habitacion.descripcion || "",
    precio_mensual:
      habitacion.precio_mensual !== null && habitacion.precio_mensual !== undefined
        ? String(habitacion.precio_mensual)
        : "",
    disponible: habitacion.disponible ? "true" : "false",
    tamano_m2:
      habitacion.tamano_m2 !== null && habitacion.tamano_m2 !== undefined
        ? String(habitacion.tamano_m2)
        : "",
    amueblada: habitacion.amueblada ? "true" : "false",
    bano: habitacion.bano ? "true" : "false",
    balcon: habitacion.balcon ? "true" : "false",
  };
}

// Devuelve un mensaje legible a partir del error recibido del backend
function getFriendlyErrorMessage(error, fallback) {
  return error?.error || error?.message || fallback;
}

// Traduce errores del endpoint de búsqueda de usuario asignable
function getSearchUserErrorMessage(error) {
  switch (error?.error) {
    case "USER_NOT_FOUND":
      return "No existe ningún usuario con ese email.";
    case "USER_INACTIVE":
      return "Ese usuario existe, pero está inactivo.";
    case "ROLE_NOT_ALLOWED_FOR_STAY":
      return "Ese usuario no puede ser asignado como inquilino.";
    case "HABITACION_NOT_FOUND":
      return "No se encontró la habitación.";
    case "HABITACION_INACTIVE":
      return "La habitación está inactiva.";
    case "PISO_INACTIVE":
      return "El piso está inactivo.";
    case "FORBIDDEN_NOT_OWNER":
      return "No tienes permisos sobre esta habitación.";
    default:
      return getFriendlyErrorMessage(error, "No se pudo buscar al usuario.");
  }
}

// Traduce errores del endpoint de asignación
function getAssignUserErrorMessage(error) {
  switch (error?.error) {
    case "USER_NOT_FOUND":
      return "No existe ningún usuario con ese email.";
    case "USER_INACTIVE":
      return "Ese usuario existe, pero está inactivo.";
    case "ROLE_NOT_ALLOWED_FOR_STAY":
      return "Ese usuario no puede ser asignado como inquilino.";
    case "USER_ALREADY_HAS_ACTIVE_STAY":
      return "Ese usuario ya tiene una estancia activa.";
    case "ROOM_ALREADY_OCCUPIED":
      return "La habitación ya está ocupada.";
    case "ROOM_NOT_AVAILABLE":
      return "La habitación no está disponible.";
    case "HABITACION_NOT_FOUND":
      return "No se encontró la habitación.";
    case "HABITACION_INACTIVE":
      return "La habitación está inactiva.";
    case "PISO_INACTIVE":
      return "El piso está inactivo.";
    case "FORBIDDEN_NOT_OWNER":
      return "No tienes permisos sobre esta habitación.";
    case "CONFLICT_ACTIVE_STAY_OR_OCCUPANCY":
      return "Se produjo un conflicto de ocupación o estancia activa.";
    default:
      return getFriendlyErrorMessage(error, "No se pudo asignar el usuario.");
  }
}

// Busca al ocupante actual de esta habitación dentro del listado de convivientes del piso
function getCurrentOccupantFromConvivientes(convivientes, habitacionId) {
  return (
    convivientes.find(
      (item) => Number(item.habitacion_id) === Number(habitacionId)
    ) || null
  );
}

export default function HabitacionManagerDetail() {
  const { habitacionId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("editar");

  const [habitacion, setHabitacion] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadForm, setUploadForm] = useState(EMPTY_UPLOAD_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const [updatingPhotoId, setUpdatingPhotoId] = useState(null);

  const [photoOrderValues, setPhotoOrderValues] = useState({});
  const [photoOrderFeedback, setPhotoOrderFeedback] = useState({});
  const [photoSectionFeedback, setPhotoSectionFeedback] = useState(null);
  const [editFeedback, setEditFeedback] = useState(null);

  const [openPhotoMenuId, setOpenPhotoMenuId] = useState(null);
  const [editingPhotoOrderId, setEditingPhotoOrderId] = useState(null);
  const [fotoToDelete, setFotoToDelete] = useState(null);

  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // Estado de la tab de ocupación
  const [currentOccupant, setCurrentOccupant] = useState(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [candidateResult, setCandidateResult] = useState(null);
  const [occupancyFeedback, setOccupancyFeedback] = useState(null);

  // Estados de carga para búsqueda, asignación y refresco de ocupación
  const [occupancyLoading, setOccupancyLoading] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);
  const [assigningUser, setAssigningUser] = useState(false);
  const [removingOccupant, setRemovingOccupant] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        setEditFeedback(null);
        setPhotoSectionFeedback(null);

        const data = await getAdminHabitacionById(habitacionId);

        if (!isMounted) return;

        const nextHabitacion = data?.habitacion || null;

        setHabitacion(nextHabitacion);
        setFotos(Array.isArray(data?.fotos) ? data.fotos : []);
        setForm(buildFormFromHabitacion(nextHabitacion));
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudo cargar el detalle de la habitación.");
        setHabitacion(null);
        setFotos([]);
        setForm(EMPTY_FORM);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [habitacionId]);

  useEffect(() => {
    setPhotoOrderValues(
      Object.fromEntries(fotos.map((foto) => [foto.id, String(foto.orden)]))
    );
  }, [fotos]);

  // Carga el ocupante actual de esta habitación filtrando los convivientes activos del piso
  const refreshOccupancy = useCallback(async (room, { showError = false } = {}) => {
    if (!room?.piso_id || !room?.id) {
      setCurrentOccupant(null);
      return;
    }

    try {
      setOccupancyLoading(true);

      const data = await listConvivientesByPiso(room.piso_id);
      const convivientes = Array.isArray(data?.convivientes) ? data.convivientes : [];

      setCurrentOccupant(
        getCurrentOccupantFromConvivientes(convivientes, room.id)
      );
    } catch (err) {
      setCurrentOccupant(null);

      if (showError) {
        setOccupancyFeedback({
          type: "error",
          message: getFriendlyErrorMessage(
            err,
            "No se pudo cargar la ocupación actual de la habitación."
          ),
        });
      }
    } finally {
      setOccupancyLoading(false);
    }
  }, []);

  // Cuando cargamos la habitación, también cargamos quién la ocupa ahora mismo
  useEffect(() => {
    if (!habitacion?.id || !habitacion?.piso_id) {
      setCurrentOccupant(null);
      return;
    }

    refreshOccupancy(habitacion, { showError: true });
  }, [habitacion, refreshOccupancy]);

  function handleSelectTab(nextTab) {
    setActiveTab(nextTab);
    setOpenPhotoMenuId(null);

    if (nextTab !== "fotos") {
      setEditingPhotoOrderId(null);
    }

    // Al salir de la tab de ocupación, limpiamos solo el feedback visual
    if (nextTab !== "ocupacion") {
      setOccupancyFeedback(null);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm() {
    setForm(buildFormFromHabitacion(habitacion));
    setEditFeedback(null);
  }

  function openPhotoModal(index) {
    setOpenPhotoMenuId(null);
    setSelectedPhotoIndex(index);
    setIsPhotoModalOpen(true);
  }

  function closePhotoModal() {
    setIsPhotoModalOpen(false);
  }

  function showPrevPhoto() {
    setSelectedPhotoIndex((prev) =>
      prev === 0 ? fotos.length - 1 : prev - 1
    );
  }

  function showNextPhoto() {
    setSelectedPhotoIndex((prev) =>
      prev === fotos.length - 1 ? 0 : prev + 1
    );
  }

  function togglePhotoMenu(fotoId, event) {
    event.stopPropagation();
    setOpenPhotoMenuId((prev) => (prev === fotoId ? null : fotoId));
  }

  function openPhotoOrderEditor(fotoId, event) {
    event.stopPropagation();
    setOpenPhotoMenuId(null);

    setPhotoOrderFeedback((prev) => {
      const next = { ...prev };
      delete next[fotoId];
      return next;
    });

    setEditingPhotoOrderId(fotoId);
  }

  function closePhotoOrderEditor(fotoId, event) {
    if (event) event.stopPropagation();

    setEditingPhotoOrderId(null);

    setPhotoOrderFeedback((prev) => {
      const next = { ...prev };
      delete next[fotoId];
      return next;
    });
  }

  async function uploadPhotoFile(file) {
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setPhotoSectionFeedback(null);
      setError("");

      const formData = new FormData();
      formData.append("foto", file);

      if (uploadForm.orden !== "") {
        formData.append("orden", uploadForm.orden);
      }

      const data = await addAdminHabitacionFoto(habitacionId, formData);
      const nuevaFoto = data?.foto || null;

      if (nuevaFoto) {
        setFotos((prev) =>
          [...prev, nuevaFoto].sort((a, b) => {
            if (a.orden !== b.orden) return a.orden - b.orden;
            return a.id - b.id;
          })
        );
      }

      setUploadForm(EMPTY_UPLOAD_FORM);
      setPhotoSectionFeedback({
        type: "success",
        message: "Foto subida correctamente.",
      });
    } catch (err) {
      setPhotoSectionFeedback({
        type: "error",
        message: err?.error || err?.message || "No se pudo subir la foto.",
      });
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handlePhotoFileChange(event) {
    const file = event.target.files?.[0] || null;
    setUploadForm((prev) => ({ ...prev, foto: file }));
    uploadPhotoFile(file);
  }

  function handlePhotoOrderChange(event) {
    const { value } = event.target;
    setUploadForm((prev) => ({ ...prev, orden: value }));
  }

  function handlePhotoDragOver(event) {
    event.preventDefault();
    setIsDraggingPhoto(true);
  }

  function handlePhotoDragLeave(event) {
    event.preventDefault();
    setIsDraggingPhoto(false);
  }

  function handlePhotoDrop(event) {
    event.preventDefault();
    setIsDraggingPhoto(false);

    const file = event.dataTransfer?.files?.[0] || null;
    if (!file) return;

    setUploadForm((prev) => ({ ...prev, foto: file }));
    uploadPhotoFile(file);
  }

  function handlePhotoOrderValueChange(fotoId, value) {
    setPhotoOrderValues((prev) => ({
      ...prev,
      [fotoId]: value,
    }));

    setPhotoOrderFeedback((prev) => {
      const next = { ...prev };
      delete next[fotoId];
      return next;
    });
  }

  async function handleSavePhotoOrder(foto) {
    const rawValue = photoOrderValues[foto.id];
    const nextOrder = Number(rawValue);

    if (!Number.isInteger(nextOrder) || nextOrder < 0) {
      setPhotoOrderFeedback((prev) => ({
        ...prev,
        [foto.id]: {
          type: "error",
          message: "El orden debe ser un número entero mayor o igual que 0.",
        },
      }));
      return;
    }

    try {
      setUpdatingPhotoId(foto.id);

      const data = await updateAdminHabitacionFoto(habitacionId, foto.id, {
        orden: nextOrder,
      });

      const updatedFoto = data?.foto || null;
      if (!updatedFoto) return;

      setFotos((prev) =>
        prev
          .map((item) => (item.id === foto.id ? updatedFoto : item))
          .sort((a, b) => {
            if (a.orden !== b.orden) return a.orden - b.orden;
            return a.id - b.id;
          })
      );

      setEditingPhotoOrderId(null);

      setPhotoOrderFeedback((prev) => ({
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

      setPhotoOrderFeedback((prev) => ({
        ...prev,
        [foto.id]: {
          type: "error",
          message: friendlyMessage,
        },
      }));
    } finally {
      setUpdatingPhotoId(null);
    }
  }

  function requestDeletePhoto(foto, event) {
    if (event) event.stopPropagation();
    setOpenPhotoMenuId(null);
    setFotoToDelete(foto);
  }

  function closeDeletePhotoModal() {
    if (deletingPhotoId) return;
    setFotoToDelete(null);
  }

  async function handleConfirmDeletePhoto() {
    if (!fotoToDelete) return;

    try {
      setDeletingPhotoId(fotoToDelete.id);
      setPhotoSectionFeedback(null);

      setPhotoOrderFeedback((prev) => {
        const next = { ...prev };
        delete next[fotoToDelete.id];
        return next;
      });

      await deleteAdminHabitacionFoto(habitacionId, fotoToDelete.id);

      setFotos((prev) => prev.filter((foto) => foto.id !== fotoToDelete.id));

      if (editingPhotoOrderId === fotoToDelete.id) {
        setEditingPhotoOrderId(null);
      }

      setFotoToDelete(null);
      setPhotoSectionFeedback({
        type: "success",
        message: "Foto eliminada correctamente.",
      });
    } catch (err) {
      setPhotoSectionFeedback({
        type: "error",
        message: err?.error || err?.message || "No se pudo eliminar la foto.",
      });
    } finally {
      setDeletingPhotoId(null);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setEditFeedback(null);

      const payload = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        precio_mensual: Number(form.precio_mensual),
        disponible: form.disponible === "true",
        tamano_m2: form.tamano_m2 === "" ? null : Number(form.tamano_m2),
        amueblada: form.amueblada === "true",
        bano: form.bano === "true",
        balcon: form.balcon === "true",
      };

      const data = await updateAdminHabitacion(habitacionId, payload);
      const updatedHabitacion = data?.habitacion || null;

      setHabitacion(updatedHabitacion);
      setForm(buildFormFromHabitacion(updatedHabitacion));
      setEditFeedback({
        type: "success",
        message: "Habitación actualizada correctamente.",
      });
    } catch (err) {
      setEditFeedback({
        type: "error",
        message: err?.error || err?.message || "No se pudo actualizar la habitación.",
      });
    } finally {
      setSaving(false);
    }
  }

  // Busca un usuario por email para evaluar si se puede asignar a esta habitación
  async function handleSearchAssignableUser(event) {
    event.preventDefault();

    const normalizedEmail = searchEmail.trim();

    if (!normalizedEmail) {
      setCandidateResult(null);
      setOccupancyFeedback({
        type: "error",
        message: "Debes introducir un email.",
      });
      return;
    }

    try {
      setSearchingUser(true);
      setCandidateResult(null);
      setOccupancyFeedback(null);

      const data = await searchAssignableUserByEmail({
        habitacionId,
        email: normalizedEmail,
      });

      setCandidateResult(data);

      if (data?.assignment?.has_active_stay) {
        setOccupancyFeedback({
          type: "error",
          message: "El usuario existe, pero ya tiene una estancia activa.",
        });
      } else {
        setOccupancyFeedback({
          type: "success",
          message: "Usuario encontrado correctamente.",
        });
      }
    } catch (err) {
      setCandidateResult(null);
      setOccupancyFeedback({
        type: "error",
        message: getSearchUserErrorMessage(err),
      });
    } finally {
      setSearchingUser(false);
    }
  }

  // Asigna el usuario encontrado a la habitación actual
  async function handleAssignUserToRoom() {
    const email = candidateResult?.user?.email;

    if (!email) return;

    try {
      setAssigningUser(true);
      setOccupancyFeedback(null);

      await joinHabitacion({
        habitacionId: Number(habitacionId),
        email,
      });

      // Reflejamos inmediatamente que la habitación deja de estar disponible
      setHabitacion((prev) =>
        prev
          ? {
              ...prev,
              disponible: false,
            }
          : prev
      );

      setForm((prev) => ({
        ...prev,
        disponible: "false",
      }));

      // Limpiamos el buscador y volvemos a cargar la ocupación actual
      setSearchEmail("");
      setCandidateResult(null);

      await refreshOccupancy(
        {
          id: Number(habitacionId),
          piso_id: habitacion?.piso_id,
        },
        { showError: true }
      );

      setOccupancyFeedback({
        type: "success",
        message: "Usuario asignado correctamente a la habitación.",
      });
    } catch (err) {
      setOccupancyFeedback({
        type: "error",
        message: getAssignUserErrorMessage(err),
      });
    } finally {
      setAssigningUser(false);
    }
  }

  // Quita de la habitación al ocupante actual
  async function handleRemoveOccupantFromRoom() {
    const usuarioHabitacionId = currentOccupant?.usuario_habitacion_id;

    if (!usuarioHabitacionId) return;

    try {
      setRemovingOccupant(true);
      setOccupancyFeedback(null);

      await kickFromHabitacion(usuarioHabitacionId, {});

      // Reflejamos inmediatamente que la habitación vuelve a estar disponible
      setHabitacion((prev) =>
        prev
          ? {
              ...prev,
              disponible: true,
            }
          : prev
      );

      setForm((prev) => ({
        ...prev,
        disponible: "true",
      }));

      await refreshOccupancy(
        {
          id: Number(habitacionId),
          piso_id: habitacion?.piso_id,
        },
        { showError: true }
      );

      setOccupancyFeedback({
        type: "success",
        message: "Usuario retirado de la habitación correctamente.",
      });
    } catch (err) {
      setOccupancyFeedback({
        type: "error",
        message: getFriendlyErrorMessage(
          err,
          "No se pudo quitar al usuario de la habitación."
        ),
      });
    } finally {
      setRemovingOccupant(false);
    }
  }

  const fotoCount = fotos.length;

  return (
    <>
      <PageShell
        title="Detalle de habitación"
        subtitle="Consulta y edita la información completa de la habitación."
        variant="plain"
        contentClassName="space-y-6"
        actions={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(-1)}
          >
            Volver
          </button>
        }
      >
        {error ? <div className="alert-error">{error}</div> : null}

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

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="skeleton h-12 w-full rounded-xl" />
              <div className="skeleton h-12 w-full rounded-xl" />
              <div className="skeleton h-12 w-full rounded-xl" />
            </div>
          </div>
        ) : habitacion ? (
          <>
            <div className="card">
              <div className="card-body space-y-4">
                {fotos.length > 0 ? (
                  <button
                    type="button"
                    className="block w-full"
                    onClick={() => openPhotoModal(0)}
                  >
                    <img
                      src={buildImageUrl(fotos[0].url)}
                      alt={habitacion.titulo || `Habitación ${habitacion.id}`}
                      className="aspect-[16/6] w-full rounded-lg object-cover"
                    />
                  </button>
                ) : (
                  <div className="skeleton aspect-[16/6] w-full rounded-lg" />
                )}

                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-ui-text">
                      {habitacion.titulo || "Sin título"}
                    </h2>

                    <p className="text-sm text-ui-text-secondary">
                      {habitacion.ciudad || "—"}
                      {habitacion.direccion ? ` · ${habitacion.direccion}` : ""}
                      {habitacion.codigo_postal ? ` · ${habitacion.codigo_postal}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={habitacion.activo ? "badge badge-success" : "badge badge-neutral"}
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
                  {habitacion.descripcion || "Sin descripción."}
                </p>
              </div>
            </div>

            <div className="space-y-0">
              <div
                role="tablist"
                aria-label="Secciones del detalle de la habitación"
                className="grid grid-cols-1 gap-2 md:grid-cols-3"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "editar"}
                  className={`flex items-center justify-between border px-4 py-3 text-left transition-all duration-200 ${
                    activeTab === "editar"
                      ? "relative z-10 -mb-px rounded-t-2xl rounded-b-none border-slate-300 border-b-white bg-white text-brand-primary shadow-sm"
                      : "cursor-pointer rounded-xl border-slate-400 bg-white text-ui-text shadow-sm hover:-translate-y-0.5 hover:border-brand-primary hover:bg-blue-50/60 hover:text-brand-primary hover:shadow-md"
                  }`}
                  onClick={() => handleSelectTab("editar")}
                >
                  <span className="font-semibold">Editar habitación</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      activeTab === "editar"
                        ? "bg-blue-100 text-brand-primary"
                        : "bg-slate-100 text-ui-text-secondary"
                    }`}
                  >
                    Formulario
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "ocupacion"}
                  className={`flex items-center justify-between border px-4 py-3 text-left transition-all duration-200 ${
                    activeTab === "ocupacion"
                      ? "relative z-10 -mb-px rounded-t-2xl rounded-b-none border-slate-300 border-b-white bg-white text-brand-primary shadow-sm"
                      : "cursor-pointer rounded-xl border-slate-400 bg-white text-ui-text shadow-sm hover:-translate-y-0.5 hover:border-brand-primary hover:bg-blue-50/60 hover:text-brand-primary hover:shadow-md"
                  }`}
                  onClick={() => handleSelectTab("ocupacion")}
                >
                  <span className="font-semibold">Ocupación</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      activeTab === "ocupacion"
                        ? "bg-blue-100 text-brand-primary"
                        : "bg-slate-100 text-ui-text-secondary"
                    }`}
                  >
                    {currentOccupant ? "Ocupada" : "Libre"}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "fotos"}
                  className={`flex items-center justify-between border px-4 py-3 text-left transition-all duration-200 ${
                    activeTab === "fotos"
                      ? "relative z-10 -mb-px rounded-t-2xl rounded-b-none border-slate-300 border-b-white bg-white text-brand-primary shadow-sm"
                      : "cursor-pointer rounded-xl border-slate-400 bg-white text-ui-text shadow-sm hover:-translate-y-0.5 hover:border-brand-primary hover:bg-blue-50/60 hover:text-brand-primary hover:shadow-md"
                  }`}
                  onClick={() => handleSelectTab("fotos")}
                >
                  <span className="font-semibold">Fotos de la habitación</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      activeTab === "fotos"
                        ? "bg-blue-100 text-brand-primary"
                        : "bg-slate-100 text-ui-text-secondary"
                    }`}
                  >
                    {fotoCount}
                  </span>
                </button>
              </div>

              <div
                className={`border border-slate-300 bg-white p-4 md:p-5 ${
                  activeTab === "editar"
                    ? "rounded-b-2xl rounded-tr-2xl rounded-tl-none"
                    : activeTab === "ocupacion"
                      ? "rounded-b-2xl rounded-tl-2xl rounded-tr-2xl"
                      : "rounded-b-2xl rounded-tl-2xl rounded-tr-none"
                }`}
              >
                {activeTab === "editar" ? (
                  <section className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-lg border border-amber-300 bg-amber-50">
                        <div className="card-body">
                          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                            Precio mensual
                          </p>
                          <p className="mt-2 text-2xl font-bold text-ui-text">
                            {formatEur(habitacion.precio_mensual)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-sky-300 bg-sky-50">
                        <div className="card-body">
                          <p className="text-xs font-medium uppercase tracking-wide text-sky-600">
                            Tamaño
                          </p>
                          <p className="mt-2 text-2xl font-bold text-ui-text">
                            {habitacion.tamano_m2 ? `${habitacion.tamano_m2} m²` : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-violet-300 bg-violet-50">
                        <div className="card-body">
                          <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
                            Piso
                          </p>
                          <p className="mt-2 text-2xl font-bold text-ui-text">
                            #{habitacion.piso_id}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                        Editar habitación
                      </h3>
                      <p className="mt-1 text-sm text-ui-text-secondary">
                        Actualiza los datos principales de la habitación.
                      </p>
                    </div>

                    {editFeedback ? (
                      <div
                        className={
                          editFeedback.type === "success"
                            ? "alert-success"
                            : "alert-error"
                        }
                      >
                        {editFeedback.message}
                      </div>
                    ) : null}

                    <form className="space-y-4" onSubmit={handleSubmit}>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="label" htmlFor="titulo">
                            Título
                          </label>
                          <input
                            id="titulo"
                            name="titulo"
                            type="text"
                            className="input"
                            value={form.titulo}
                            onChange={handleChange}
                            disabled={saving}
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
                            value={form.descripcion}
                            onChange={handleChange}
                            disabled={saving}
                          />
                        </div>

                        <div>
                          <label className="label" htmlFor="precio_mensual">
                            Precio mensual
                          </label>
                          <input
                            id="precio_mensual"
                            name="precio_mensual"
                            type="number"
                            min="0"
                            className="input"
                            value={form.precio_mensual}
                            onChange={handleChange}
                            disabled={saving}
                          />
                        </div>

                        <div>
                          <label className="label" htmlFor="tamano_m2">
                            Tamaño (m²)
                          </label>
                          <input
                            id="tamano_m2"
                            name="tamano_m2"
                            type="number"
                            min="1"
                            className="input"
                            value={form.tamano_m2}
                            onChange={handleChange}
                            disabled={saving}
                          />
                        </div>

                        <div>
                          <label className="label" htmlFor="disponible">
                            Disponibilidad
                          </label>
                          <select
                            id="disponible"
                            name="disponible"
                            className="select"
                            value={form.disponible}
                            onChange={handleChange}
                            disabled={saving}
                          >
                            <option value="true">Disponible</option>
                            <option value="false">No disponible</option>
                          </select>
                        </div>

                        <div>
                          <label className="label" htmlFor="amueblada">
                            Amueblada
                          </label>
                          <select
                            id="amueblada"
                            name="amueblada"
                            className="select"
                            value={form.amueblada}
                            onChange={handleChange}
                            disabled={saving}
                          >
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
                            value={form.bano}
                            onChange={handleChange}
                            disabled={saving}
                          >
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
                            value={form.balcon}
                            onChange={handleChange}
                            disabled={saving}
                          >
                            <option value="true">Sí</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="btn border border-rose-300 bg-rose-100 text-rose-800 hover:bg-rose-200"
                          onClick={() => handleSelectTab("fotos")}
                          disabled={saving}
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          className="btn border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200"
                          onClick={resetForm}
                          disabled={saving}
                        >
                          Restablecer
                        </button>

                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={saving}
                          aria-busy={saving}
                        >
                          {saving ? "Guardando..." : "Guardar cambios"}
                        </button>
                      </div>
                    </form>
                  </section>
                ) : null}

                {activeTab === "ocupacion" ? (
                  <section className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                        Ocupación de la habitación
                      </h3>
                      <p className="mt-1 text-sm text-ui-text-secondary">
                        Busca un usuario por email, revisa su reputación y asígnalo a esta habitación.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-lg border border-emerald-300 bg-emerald-50">
                        <div className="card-body">
                          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                            Estado de ocupación
                          </p>
                          <p className="mt-2 text-2xl font-bold text-ui-text">
                            {currentOccupant ? "Ocupada" : "Libre"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-sky-300 bg-sky-50">
                        <div className="card-body">
                          <p className="text-xs font-medium uppercase tracking-wide text-sky-600">
                            Disponibilidad
                          </p>
                          <p className="mt-2 text-2xl font-bold text-ui-text">
                            {habitacion.disponible ? "Disponible" : "No disponible"}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-violet-300 bg-violet-50">
                        <div className="card-body">
                          <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
                            Estado de la habitación
                          </p>
                          <p className="mt-2 text-2xl font-bold text-ui-text">
                            {habitacion.activo ? "Activa" : "Inactiva"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {occupancyFeedback ? (
                      <div
                        className={
                          occupancyFeedback.type === "success"
                            ? "alert-success"
                            : "alert-error"
                        }
                      >
                        {occupancyFeedback.message}
                      </div>
                    ) : null}

                    {occupancyLoading ? (
                      <div className="card">
                        <div className="card-body space-y-3">
                          <div className="skeleton h-5 w-1/3" />
                          <div className="skeleton h-4 w-1/2" />
                          <div className="skeleton h-20 w-full" />
                        </div>
                      </div>
                    ) : null}

                    {currentOccupant ? (
                      <div className="card">
                        <div className="card-body space-y-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <h4 className="text-lg font-semibold text-ui-text">
                                Ocupante actual
                              </h4>
                              <p className="mt-1 text-sm text-ui-text-secondary">
                                Esta habitación ya tiene un usuario asignado.
                              </p>
                            </div>

                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={handleRemoveOccupantFromRoom}
                              disabled={removingOccupant}
                            >
                              {removingOccupant
                                ? "Quitando..."
                                : "Quitar de la habitación"}
                            </button>
                          </div>

                          <div className="rounded-lg border border-ui-border bg-slate-50 p-4">
                            <div className="space-y-2">
                              <p className="text-sm text-ui-text">
                                <span className="font-semibold">Nombre:</span>{" "}
                                {currentOccupant.nombre} {currentOccupant.apellidos}
                              </p>

                              <p className="text-sm text-ui-text">
                                <span className="font-semibold">Habitación:</span>{" "}
                                #{currentOccupant.habitacion_id}
                              </p>

                              <p className="text-sm text-ui-text">
                                <span className="font-semibold">Fecha de entrada:</span>{" "}
                                {currentOccupant.fecha_entrada
                                  ? new Date(currentOccupant.fecha_entrada).toLocaleString("es-ES")
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="card">
                          <div className="card-body space-y-4">
                            <div>
                              <h4 className="text-lg font-semibold text-ui-text">
                                Buscar usuario por email
                              </h4>
                              <p className="mt-1 text-sm text-ui-text-secondary">
                                Introduce el email exacto del usuario para revisar su ficha antes de asignarlo.
                              </p>
                            </div>

                            <form className="space-y-4" onSubmit={handleSearchAssignableUser}>
                              <div className="max-w-xl">
                                <label className="label" htmlFor="assignable-user-email">
                                  Email del usuario
                                </label>
                                <input
                                  id="assignable-user-email"
                                  type="email"
                                  className="input"
                                  value={searchEmail}
                                  onChange={(event) => setSearchEmail(event.target.value)}
                                  placeholder="usuario@email.com"
                                  disabled={searchingUser || assigningUser}
                                />
                              </div>

                              <div className="flex items-center justify-end">
                                <button
                                  type="submit"
                                  className="btn btn-primary"
                                  disabled={searchingUser || assigningUser}
                                >
                                  {searchingUser ? "Buscando..." : "Buscar usuario"}
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>

                        {candidateResult ? (
                          <div className="card">
                            <div className="card-body space-y-6">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <h4 className="text-lg font-semibold text-ui-text">
                                    Usuario encontrado
                                  </h4>
                                  <p className="mt-1 text-sm text-ui-text-secondary">
                                    Revisa la información antes de asignarlo a esta habitación.
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={handleAssignUserToRoom}
                                  disabled={
                                    assigningUser ||
                                    !candidateResult.assignment?.can_assign ||
                                    !habitacion.activo ||
                                    !habitacion.disponible
                                  }
                                >
                                  {assigningUser
                                    ? "Asignando..."
                                    : "Asignar a esta habitación"}
                                </button>
                              </div>

                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="rounded-lg border border-ui-border bg-slate-50 p-4">
                                  <h5 className="text-base font-semibold text-ui-text">
                                    Datos del usuario
                                  </h5>

                                  <div className="mt-3 space-y-2 text-sm text-ui-text">
                                    <p>
                                      <span className="font-semibold">Nombre:</span>{" "}
                                      {candidateResult.user.nombre} {candidateResult.user.apellidos}
                                    </p>

                                    <p>
                                      <span className="font-semibold">Email:</span>{" "}
                                      {candidateResult.user.email}
                                    </p>

                                    <p>
                                      <span className="font-semibold">Teléfono:</span>{" "}
                                      {candidateResult.user.telefono || "—"}
                                    </p>

                                    <p>
                                      <span className="font-semibold">Rol:</span>{" "}
                                      {candidateResult.user.rol}
                                    </p>

                                    <p>
                                      <span className="font-semibold">Estado:</span>{" "}
                                      {candidateResult.user.activo ? "Activo" : "Inactivo"}
                                    </p>
                                  </div>
                                </div>

                                <div className="rounded-lg border border-ui-border bg-slate-50 p-4">
                                  <h5 className="text-base font-semibold text-ui-text">
                                    Estado de asignación
                                  </h5>

                                  <div className="mt-3 space-y-2 text-sm text-ui-text">
                                    <p>
                                      <span className="font-semibold">Se puede asignar:</span>{" "}
                                      {candidateResult.assignment?.can_assign ? "Sí" : "No"}
                                    </p>

                                    <p>
                                      <span className="font-semibold">Tiene estancia activa:</span>{" "}
                                      {candidateResult.assignment?.has_active_stay ? "Sí" : "No"}
                                    </p>

                                    {candidateResult.assignment?.active_stay ? (
                                      <>
                                        <p>
                                          <span className="font-semibold">Ciudad actual:</span>{" "}
                                          {candidateResult.assignment.active_stay.ciudad || "—"}
                                        </p>

                                        <p>
                                          <span className="font-semibold">Dirección actual:</span>{" "}
                                          {candidateResult.assignment.active_stay.direccion || "—"}
                                        </p>

                                        <p>
                                          <span className="font-semibold">Habitación actual:</span>{" "}
                                          {candidateResult.assignment.active_stay.habitacion_titulo || "—"}
                                        </p>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-lg border border-ui-border bg-slate-50 p-4">
                                <h5 className="text-base font-semibold text-ui-text">
                                  Reputación global
                                </h5>

                                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-4">
                                  <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                      Total votos
                                    </p>
                                    <p className="mt-1 text-lg font-bold text-ui-text">
                                      {candidateResult.reputacion?.global?.total_votos ?? 0}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                      Limpieza
                                    </p>
                                    <p className="mt-1 text-lg font-bold text-ui-text">
                                      {candidateResult.reputacion?.global?.medias?.limpieza ?? "—"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                      Ruido
                                    </p>
                                    <p className="mt-1 text-lg font-bold text-ui-text">
                                      {candidateResult.reputacion?.global?.medias?.ruido ?? "—"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                      Pagos
                                    </p>
                                    <p className="mt-1 text-lg font-bold text-ui-text">
                                      {candidateResult.reputacion?.global?.medias?.puntualidad_pagos ?? "—"}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-lg border border-ui-border bg-slate-50 p-4">
                                <h5 className="text-base font-semibold text-ui-text">
                                  Reputación por piso
                                </h5>

                                {candidateResult.reputacion?.por_piso?.length > 0 ? (
                                  <div className="mt-3 space-y-3">
                                    {candidateResult.reputacion.por_piso.map((item) => (
                                      <div
                                        key={item.piso.id}
                                        className="rounded-lg border border-ui-border bg-white p-4"
                                      >
                                        <div className="space-y-2 text-sm text-ui-text">
                                          <p>
                                            <span className="font-semibold">Piso:</span>{" "}
                                            #{item.piso.id} · {item.piso.ciudad || "—"} ·{" "}
                                            {item.piso.direccion || "—"}
                                          </p>

                                          <p>
                                            <span className="font-semibold">Total votos:</span>{" "}
                                            {item.total_votos}
                                          </p>

                                          <p>
                                            <span className="font-semibold">Limpieza:</span>{" "}
                                            {item.medias?.limpieza ?? "—"} ·{" "}
                                            <span className="font-semibold">Ruido:</span>{" "}
                                            {item.medias?.ruido ?? "—"} ·{" "}
                                            <span className="font-semibold">Pagos:</span>{" "}
                                            {item.medias?.puntualidad_pagos ?? "—"}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-3 text-sm text-ui-text-secondary">
                                    Este usuario todavía no tiene reputación por piso.
                                  </p>
                                )}
                              </div>

                              <div className="rounded-lg border border-ui-border bg-slate-50 p-4">
                                <h5 className="text-base font-semibold text-ui-text">
                                  Historial de estancias
                                </h5>

                                {candidateResult.historial_estancias?.length > 0 ? (
                                  <div className="mt-3 space-y-3">
                                    {candidateResult.historial_estancias.map((stay) => (
                                      <div
                                        key={stay.usuario_habitacion_id}
                                        className="rounded-lg border border-ui-border bg-white p-4"
                                      >
                                        <div className="space-y-2 text-sm text-ui-text">
                                          <p>
                                            <span className="font-semibold">Piso:</span>{" "}
                                            #{stay.piso_id} · {stay.ciudad || "—"} ·{" "}
                                            {stay.direccion || "—"}
                                          </p>

                                          <p>
                                            <span className="font-semibold">Habitación:</span>{" "}
                                            {stay.habitacion_titulo || `#${stay.habitacion_id}`}
                                          </p>

                                          <p>
                                            <span className="font-semibold">Entrada:</span>{" "}
                                            {stay.fecha_entrada
                                              ? new Date(stay.fecha_entrada).toLocaleString("es-ES")
                                              : "—"}
                                          </p>

                                          <p>
                                            <span className="font-semibold">Salida:</span>{" "}
                                            {stay.fecha_salida
                                              ? new Date(stay.fecha_salida).toLocaleString("es-ES")
                                              : "Activa"}
                                          </p>

                                          <p>
                                            <span className="font-semibold">Estado:</span>{" "}
                                            {stay.estado}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-3 text-sm text-ui-text-secondary">
                                    Este usuario todavía no tiene estancias registradas.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </section>
                ) : null}

                {activeTab === "fotos" ? (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                        Fotos de la habitación
                      </h3>
                      <span className="text-xs text-ui-text-secondary">
                        Total: {fotos.length}
                      </span>
                    </div>

                    {photoSectionFeedback ? (
                      <div
                        className={
                          photoSectionFeedback.type === "success"
                            ? "alert-success"
                            : "alert-error"
                        }
                      >
                        {photoSectionFeedback.message}
                      </div>
                    ) : null}

                    <div className="card">
                      <div className="card-body space-y-4">
                        <div>
                          <h4 className="text-base font-semibold text-ui-text">Añadir foto</h4>
                          <p className="mt-1 text-sm text-ui-text-secondary">
                            Selecciona una imagen desde tu equipo para subirla a esta habitación.
                          </p>
                        </div>

                        {uploadingPhoto ? (
                          <div className="flex justify-end">
                            <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
                              Subiendo foto...
                            </div>
                          </div>
                        ) : null}

                        <form className="space-y-4" onSubmit={(event) => event.preventDefault()}>
                          <label
                            htmlFor="foto"
                            onDragOver={handlePhotoDragOver}
                            onDragLeave={handlePhotoDragLeave}
                            onDrop={handlePhotoDrop}
                            className={`flex min-h-[160px] cursor-pointer items-center justify-center rounded-lg border-[3px] border-dashed px-4 py-6 text-center transition-colors ${
                              isDraggingPhoto
                                ? "border-emerald-300 bg-emerald-100"
                                : "border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100"
                            }`}
                          >
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-ui-text">
                                {uploadForm.foto
                                  ? uploadForm.foto.name
                                  : "Haz clic o arrastra una foto aquí"}
                              </p>
                              <p className="text-xs text-ui-text-secondary">
                                JPG, PNG u otros formatos de imagen · máximo 8 MB
                              </p>
                            </div>
                          </label>

                          <input
                            id="foto"
                            name="foto"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoFileChange}
                            disabled={uploadingPhoto}
                          />

                          <div className="max-w-[220px]">
                            <label className="label" htmlFor="orden">
                              Orden (opcional)
                            </label>
                            <input
                              id="orden"
                              name="orden"
                              type="number"
                              min="0"
                              className="input"
                              value={uploadForm.orden}
                              onChange={handlePhotoOrderChange}
                              disabled={uploadingPhoto}
                            />
                          </div>
                        </form>
                      </div>
                    </div>

                    {fotos.length === 0 ? (
                      <div className="card">
                        <div className="card-body">
                          <p className="text-sm text-ui-text-secondary">
                            Esta habitación todavía no tiene fotos.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {fotos.map((foto, index) => (
                          <article key={foto.id} className="card card-hover relative">
                            <button
                              type="button"
                              className="absolute right-[10px] top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-sky-300 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white shadow-[0_0_0_3px_rgba(96,165,250,0.35)] transition-all hover:from-sky-500 hover:via-blue-600 hover:to-indigo-700 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.4)]"
                              onClick={(event) => togglePhotoMenu(foto.id, event)}
                              aria-label="Más acciones"
                            >
                              <span className="flex items-center justify-center gap-0.5">
                                <span className="h-1 w-1 rounded-full bg-white" />
                                <span className="h-1 w-1 rounded-full bg-white" />
                                <span className="h-1 w-1 rounded-full bg-white" />
                              </span>
                            </button>

                            {openPhotoMenuId === foto.id ? (
                              <div
                                className="absolute right-3 top-12 z-30 min-w-[180px] rounded-lg border border-ui-border bg-white p-2 shadow-modal"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ui-text hover:bg-sky-100"
                                  onClick={(event) => openPhotoOrderEditor(foto.id, event)}
                                >
                                  Cambiar orden
                                </button>

                                <button
                                  type="button"
                                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ui-text hover:bg-red-100"
                                  onClick={(event) => requestDeletePhoto(foto, event)}
                                >
                                  Eliminar foto
                                </button>
                              </div>
                            ) : null}

                            <div className="card-body space-y-3">
                              <button
                                type="button"
                                className="block w-full"
                                onClick={() => openPhotoModal(index)}
                              >
                                <img
                                  src={buildImageUrl(foto.url)}
                                  alt={`Foto ${foto.orden}`}
                                  className="aspect-[4/3] w-full rounded-md object-cover"
                                />
                              </button>

                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-ui-text-secondary">
                                  ID #{foto.id}
                                </span>
                                <span className="text-xs text-ui-text-secondary">
                                  Orden #{foto.orden}
                                </span>
                              </div>

                              {editingPhotoOrderId === foto.id ? (
                                <div className="space-y-3">
                                  <div>
                                    <label className="label" htmlFor={`orden-foto-${foto.id}`}>
                                      Orden
                                    </label>
                                    <input
                                      id={`orden-foto-${foto.id}`}
                                      type="number"
                                      min="0"
                                      className="input"
                                      value={photoOrderValues[foto.id] ?? ""}
                                      onChange={(event) =>
                                        handlePhotoOrderValueChange(
                                          foto.id,
                                          event.target.value
                                        )
                                      }
                                      disabled={
                                        updatingPhotoId === foto.id ||
                                        deletingPhotoId === foto.id
                                      }
                                    />
                                  </div>

                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={(event) => closePhotoOrderEditor(foto.id, event)}
                                      disabled={
                                        updatingPhotoId === foto.id ||
                                        deletingPhotoId === foto.id
                                      }
                                    >
                                      Cancelar
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-sm border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                      disabled={
                                        updatingPhotoId === foto.id ||
                                        deletingPhotoId === foto.id
                                      }
                                      onClick={() => handleSavePhotoOrder(foto)}
                                    >
                                      {updatingPhotoId === foto.id
                                        ? "Guardando..."
                                        : "Guardar orden"}
                                    </button>
                                  </div>
                                </div>
                              ) : null}

                              {photoOrderFeedback[foto.id] ? (
                                <div
                                  className={
                                    photoOrderFeedback[foto.id].type === "success"
                                      ? "alert-success"
                                      : "alert-error"
                                  }
                                >
                                  {photoOrderFeedback[foto.id].message}
                                </div>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </PageShell>

      <Modal
        open={Boolean(fotoToDelete)}
        title="Confirmar eliminación"
        onClose={closeDeletePhotoModal}
        size="md"
        tone="danger"
        closeLabel="Cancelar"
        closeOnOverlay={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-ui-text-secondary">
            Vas a eliminar esta foto de la habitación de forma permanente.
          </p>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              Foto #{fotoToDelete?.id ?? "—"}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeDeletePhotoModal}
              disabled={Boolean(deletingPhotoId)}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleConfirmDeletePhoto}
              disabled={Boolean(deletingPhotoId)}
            >
              {deletingPhotoId ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isPhotoModalOpen}
        title="Foto de la habitación"
        onClose={closePhotoModal}
        size="default"
        closeLabel="Cerrar"
      >
        {fotos.length > 0 ? (
          <div className="space-y-4">
            <div className="relative">
              <img
                src={buildImageUrl(fotos[selectedPhotoIndex]?.url)}
                alt={`Foto ${selectedPhotoIndex + 1}`}
                className="max-h-[80vh] w-full rounded-lg object-contain"
              />

              {fotos.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-ui-border bg-white/90 px-3 py-2 text-lg font-semibold text-ui-text shadow"
                    onClick={showPrevPhoto}
                  >
                    &lt;
                  </button>

                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-ui-border bg-white/90 px-3 py-2 text-lg font-semibold text-ui-text shadow"
                    onClick={showNextPhoto}
                  >
                    &gt;
                  </button>
                </>
              ) : null}
            </div>

            <div className="text-center text-sm text-ui-text-secondary">
              Foto {selectedPhotoIndex + 1} de {fotos.length}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}