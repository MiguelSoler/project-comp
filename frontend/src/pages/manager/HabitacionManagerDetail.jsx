import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { getApiErrorMessage } from "../../services/apiClient.js";
import {
  addAdminHabitacionFoto,
  deleteAdminHabitacionFoto,
  getAdminHabitacionById,
  getAdminHabitacionHistorial,
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

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMetric(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(1);
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

function formatDisplayName(entity) {
  const nombre = entity?.nombre || "";
  const apellidos = entity?.apellidos || "";
  const fullName = `${nombre} ${apellidos}`.trim();

  if (fullName) return fullName;
  if (entity?.email) return entity.email;
  return `Usuario #${entity?.id ?? "—"}`;
}

function getInitials(entity) {
  return formatDisplayName(entity)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function buildPersonAvatar(
  entity,
  { onOpen, sizeClassName = "h-14 w-14" } = {}
) {
  const photoUrl = buildImageUrl(entity?.foto_perfil_url);
  const displayName = formatDisplayName(entity);

  if (photoUrl) {
    return (
      <button
        type="button"
        className="block overflow-hidden rounded-full"
        onClick={() => onOpen?.(photoUrl, displayName)}
        aria-label={`Ver foto de ${displayName}`}
        title={displayName}
      >
        <img
          src={photoUrl}
          alt={displayName}
          className={`${sizeClassName} rounded-full object-cover`}
        />
      </button>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-brand-primary ${sizeClassName}`}
      title={displayName}
    >
      {getInitials(entity)}
    </div>
  );
}

function getFriendlyErrorMessage(error, fallback) {
  return getApiErrorMessage(error, fallback);
}

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

function getCurrentOccupantFromConvivientes(convivientes, habitacionId) {
  return (
    convivientes.find(
      (item) => Number(item.habitacion_id) === Number(habitacionId)
    ) || null
  );
}

function getStayStateLabel(state) {
  if (state === "active") return "Activa";
  if (state === "left") return "Finalizada";
  if (state === "kicked") return "Expulsado";
  return "—";
}

function getStayStateBadgeClass(state) {
  if (state === "active") return "badge badge-success";
  if (state === "left") return "badge badge-neutral";
  if (state === "kicked") return "badge badge-warning";
  return "badge badge-neutral";
}

function MetricCard({ title, value, tone = "neutral" }) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "info"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : tone === "violet"
            ? "border-violet-200 bg-violet-50 text-violet-700"
            : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-lg border p-4 ${toneClasses}`}>
      <p className="text-xs font-medium uppercase tracking-wide">{title}</p>
      <p className="mt-2 text-2xl font-bold text-ui-text">{value}</p>
    </div>
  );
}

function CompactMetricCard({ title, value, tone = "neutral" }) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "info"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : tone === "violet"
            ? "border-violet-200 bg-violet-50 text-violet-700"
            : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-lg border px-3 py-2.5 ${toneClasses}`}>
      <p className="text-[11px] font-medium uppercase leading-tight tracking-wide">
        {title}
      </p>
      <p className="mt-1 text-lg font-bold text-ui-text">{value}</p>
    </div>
  );
}

function getHistorialItems(data) {
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.historial)) return data.historial;
  if (Array.isArray(data?.stays)) return data.stays;
  if (Array.isArray(data)) return data;
  return [];
}

function getHistorialUser(item) {
  return item?.usuario || item?.user || item || null;
}

function getHistorialReputationGlobal(item) {
  return (
    item?.reputacion_global ||
    item?.reputacionGlobal ||
    item?.global_reputation ||
    null
  );
}

function getHistorialReputationPiso(item) {
  return (
    item?.reputacion_en_este_piso ||
    item?.reputacion_en_esta_habitacion ||
    item?.reputacion_habitacion ||
    item?.reputacionHabitacion ||
    item?.room_reputation ||
    item?.reputacion_en_habitacion ||
    null
  );
}

function normalizeSummary(summary) {
  const source = summary?.resumen || summary || {};
  const medias = source?.medias || {};

  return {
    limpieza: medias?.limpieza ?? null,
    ruido: medias?.ruido ?? null,
    puntualidad_pagos: medias?.puntualidad_pagos ?? null,
    total_votos: source?.total_votos ?? summary?.total_votos ?? 0,
    media_global: source?.media_global ?? summary?.media_global ?? null,
  };
}

function getDateTimestamp(value) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function buildCandidatePisoActivity(candidateResult) {
  const reputacionPorPiso = Array.isArray(candidateResult?.reputacion?.por_piso)
    ? candidateResult.reputacion.por_piso
    : [];

  const historialEstancias = Array.isArray(candidateResult?.historial_estancias)
    ? candidateResult.historial_estancias
    : [];

  const byPiso = new Map();

  reputacionPorPiso.forEach((item) => {
    const pisoId = Number(item?.piso?.id);
    if (!Number.isFinite(pisoId)) return;

    byPiso.set(pisoId, {
      pisoId,
      piso: item.piso,
      reputacion: item,
      estancias: [],
      sortValue: getDateTimestamp(item?.last_vote_at),
    });
  });

  historialEstancias.forEach((stay) => {
    const pisoId = Number(stay?.piso_id);
    if (!Number.isFinite(pisoId)) return;

    if (!byPiso.has(pisoId)) {
      byPiso.set(pisoId, {
        pisoId,
        piso: {
          id: stay.piso_id,
          ciudad: stay.ciudad,
          direccion: stay.direccion,
        },
        reputacion: null,
        estancias: [],
        sortValue: 0,
      });
    }

    const entry = byPiso.get(pisoId);
    entry.estancias.push(stay);
    entry.sortValue = Math.max(
      entry.sortValue,
      getDateTimestamp(stay?.fecha_entrada),
      getDateTimestamp(stay?.fecha_salida)
    );
  });

  return Array.from(byPiso.values())
    .map((item) => ({
      ...item,
      estancias: [...item.estancias].sort(
        (a, b) =>
          getDateTimestamp(b?.fecha_entrada) - getDateTimestamp(a?.fecha_entrada)
      ),
    }))
    .sort((a, b) => b.sortValue - a.sortValue);
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

  const [currentOccupant, setCurrentOccupant] = useState(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [candidateResult, setCandidateResult] = useState(null);
  const [occupancyFeedback, setOccupancyFeedback] = useState(null);

  const [occupancyLoading, setOccupancyLoading] = useState(false);
  const [searchingUser, setSearchingUser] = useState(false);
  const [assigningUser, setAssigningUser] = useState(false);
  const [removingOccupant, setRemovingOccupant] = useState(false);

  const [historialItems, setHistorialItems] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialError, setHistorialError] = useState("");
  const [hasLoadedHistorial, setHasLoadedHistorial] = useState(false);

  const [isHistorialPhotoModalOpen, setIsHistorialPhotoModalOpen] = useState(false);
  const [selectedHistorialPhoto, setSelectedHistorialPhoto] = useState({
    url: "",
    alt: "",
  });

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isRemoveOccupantModalOpen, setIsRemoveOccupantModalOpen] = useState(false);

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

  const loadHistorial = useCallback(async () => {
    try {
      setLoadingHistorial(true);
      setHistorialError("");

      const data = await getAdminHabitacionHistorial(habitacionId);
      setHistorialItems(getHistorialItems(data));
      setHasLoadedHistorial(true);
    } catch (err) {
      setHistorialItems([]);
      setHistorialError(
        getFriendlyErrorMessage(
          err,
          "No se pudo cargar el historial de la habitación."
        )
      );
      setHasLoadedHistorial(true);
    } finally {
      setLoadingHistorial(false);
    }
  }, [habitacionId]);

  useEffect(() => {
    if (!habitacion?.id || !habitacion?.piso_id) {
      setCurrentOccupant(null);
      return;
    }

    refreshOccupancy(habitacion, { showError: true });
  }, [habitacion, refreshOccupancy]);

  useEffect(() => {
    if (activeTab === "historial" && !hasLoadedHistorial) {
      loadHistorial();
    }
  }, [activeTab, hasLoadedHistorial, loadHistorial]);

  function handleSelectTab(nextTab) {
    setActiveTab(nextTab);
    setOpenPhotoMenuId(null);

    if (nextTab !== "fotos") {
      setEditingPhotoOrderId(null);
    }

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

  function openHistorialPhotoModal(url, alt) {
    if (!url) return;
    setSelectedHistorialPhoto({ url, alt });
    setIsHistorialPhotoModalOpen(true);
  }

  function closeHistorialPhotoModal() {
    setSelectedHistorialPhoto({ url: "", alt: "" });
    setIsHistorialPhotoModalOpen(false);
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
        message: getApiErrorMessage(err, "No se pudo subir la foto."),
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
        message: getApiErrorMessage(err, "No se pudo eliminar la foto."),
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
        message: getApiErrorMessage(err, "No se pudo actualizar la habitación."),
      });
    } finally {
      setSaving(false);
    }
  }

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

  function openAssignModal() {
    if (!candidateResult?.user?.email) return;
    setIsAssignModalOpen(true);
  }

  function closeAssignModal() {
    if (assigningUser) return;
    setIsAssignModalOpen(false);
  }

  function openRemoveOccupantModal() {
    if (!currentOccupant?.usuario_habitacion_id) return;
    setIsRemoveOccupantModalOpen(true);
  }

  function closeRemoveOccupantModal() {
    if (removingOccupant) return;
    setIsRemoveOccupantModalOpen(false);
  }

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

      setSearchEmail("");
      setCandidateResult(null);
      setIsAssignModalOpen(false);

      await refreshOccupancy(
        {
          id: Number(habitacionId),
          piso_id: habitacion?.piso_id,
        },
        { showError: true }
      );

      setHasLoadedHistorial(false);
      if (activeTab === "historial") {
        await loadHistorial();
      }

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

  async function handleRemoveOccupantFromRoom() {
    const usuarioHabitacionId = currentOccupant?.usuario_habitacion_id;

    if (!usuarioHabitacionId) return;

    try {
      setRemovingOccupant(true);
      setOccupancyFeedback(null);

      await kickFromHabitacion(usuarioHabitacionId, {});

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

      setIsRemoveOccupantModalOpen(false);

      await refreshOccupancy(
        {
          id: Number(habitacionId),
          piso_id: habitacion?.piso_id,
        },
        { showError: true }
      );

      setHasLoadedHistorial(false);
      if (activeTab === "historial") {
        await loadHistorial();
      }

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
  const canOpenAssignModal =
    Boolean(candidateResult?.user?.email) &&
    Boolean(candidateResult?.assignment?.can_assign) &&
    Boolean(habitacion?.activo) &&
    Boolean(habitacion?.disponible);

  const candidatePisoActivity = useMemo(
    () => buildCandidatePisoActivity(candidateResult),
    [candidateResult]
  );

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

            <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
              <div className="skeleton h-12 w-full rounded-xl" />
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
                className="grid grid-cols-1 gap-2 md:grid-cols-4"
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
                  aria-selected={activeTab === "historial"}
                  className={`flex items-center justify-between border px-4 py-3 text-left transition-all duration-200 ${
                    activeTab === "historial"
                      ? "relative z-10 -mb-px rounded-t-2xl rounded-b-none border-slate-300 border-b-white bg-white text-brand-primary shadow-sm"
                      : "cursor-pointer rounded-xl border-slate-400 bg-white text-ui-text shadow-sm hover:-translate-y-0.5 hover:border-brand-primary hover:bg-blue-50/60 hover:text-brand-primary hover:shadow-md"
                  }`}
                  onClick={() => handleSelectTab("historial")}
                >
                  <span className="font-semibold">Historial</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      activeTab === "historial"
                        ? "bg-blue-100 text-brand-primary"
                        : "bg-slate-100 text-ui-text-secondary"
                    }`}
                  >
                    {historialItems.length}
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
                      : activeTab === "historial"
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
                  <section className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                        Ocupación de la habitación
                      </h3>
                      <p className="mt-1 text-sm text-ui-text-secondary">
                        Busca un usuario por email, revisa su reputación y asígnalo a esta habitación.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <MetricCard
                        title="Estado de ocupación"
                        value={currentOccupant ? "Ocupada" : "Libre"}
                        tone="success"
                      />
                      <MetricCard
                        title="Disponibilidad"
                        value={habitacion.disponible ? "Disponible" : "No disponible"}
                        tone="info"
                      />
                      <MetricCard
                        title="Estado de la habitación"
                        value={habitacion.activo ? "Activa" : "Inactiva"}
                        tone="violet"
                      />
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
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="flex items-center gap-4">
                              {buildPersonAvatar(currentOccupant, {
                                onOpen: openHistorialPhotoModal,
                              })}

                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-lg font-semibold text-ui-text">
                                    {formatDisplayName(currentOccupant)}
                                  </h4>
                                  <span className="badge badge-success">Ocupante actual</span>
                                </div>

                                <p className="text-sm text-ui-text-secondary">
                                  Habitación #{currentOccupant.habitacion_id}
                                </p>

                                <p className="text-sm text-ui-text-secondary">
                                  Entrada: {formatDateTime(currentOccupant.fecha_entrada)}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={openRemoveOccupantModal}
                              disabled={removingOccupant}
                            >
                              Quitar de la habitación
                            </button>
                          </div>

                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm text-amber-800">
                              Esta acción cerrará la estancia activa del usuario en esta habitación y volverá a marcarla como disponible.
                            </p>
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
                          <div className="space-y-4">
                            <div className="card">
                              <div className="card-body space-y-5">
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                  <div className="flex items-center gap-4">
                                    {buildPersonAvatar(candidateResult.user, {
                                      onOpen: openHistorialPhotoModal,
                                    })}

                                    <div className="space-y-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-lg font-semibold text-ui-text">
                                          {formatDisplayName(candidateResult.user)}
                                        </h4>

                                        <span className="badge badge-info">
                                          {candidateResult.user.rol}
                                        </span>

                                        <span
                                          className={
                                            candidateResult.user.activo
                                              ? "badge badge-success"
                                              : "badge badge-neutral"
                                          }
                                        >
                                          {candidateResult.user.activo ? "Activo" : "Inactivo"}
                                        </span>

                                        <span
                                          className={
                                            candidateResult.assignment?.can_assign
                                              ? "badge badge-success"
                                              : "badge badge-warning"
                                          }
                                        >
                                          {candidateResult.assignment?.can_assign
                                            ? "Asignable"
                                            : "No asignable"}
                                        </span>
                                      </div>

                                      <p className="text-sm text-ui-text-secondary">
                                        {candidateResult.user.email}
                                      </p>

                                      <p className="text-sm text-ui-text-secondary">
                                        {candidateResult.user.telefono || "Sin teléfono"}
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={openAssignModal}
                                    disabled={!canOpenAssignModal}
                                  >
                                    Asignar a esta habitación
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                  <CompactMetricCard
                                    title="Total votos"
                                    value={candidateResult.reputacion?.global?.total_votos ?? 0}
                                    tone="violet"
                                  />
                                  <CompactMetricCard
                                    title="Limpieza"
                                    value={formatMetric(
                                      candidateResult.reputacion?.global?.medias?.limpieza
                                    )}
                                    tone="success"
                                  />
                                  <CompactMetricCard
                                    title="Ruido"
                                    value={formatMetric(
                                      candidateResult.reputacion?.global?.medias?.ruido
                                    )}
                                    tone="warning"
                                  />
                                  <CompactMetricCard
                                    title="Pagos"
                                    value={formatMetric(
                                      candidateResult.reputacion?.global?.medias?.puntualidad_pagos
                                    )}
                                    tone="info"
                                  />
                                </div>

                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                                    <h5 className="text-base font-semibold text-sky-800">
                                      Datos del usuario
                                    </h5>

                                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                      <div className="rounded-lg border border-sky-200 bg-white p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                                          Nombre
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-ui-text">
                                          {formatDisplayName(candidateResult.user)}
                                        </p>
                                      </div>

                                      <div className="rounded-lg border border-sky-200 bg-white p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                                          Email
                                        </p>
                                        <p className="mt-1 break-all text-sm font-semibold text-ui-text">
                                          {candidateResult.user.email}
                                        </p>
                                      </div>

                                      <div className="rounded-lg border border-sky-200 bg-white p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                                          Teléfono
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-ui-text">
                                          {candidateResult.user.telefono || "—"}
                                        </p>
                                      </div>

                                      <div className="rounded-lg border border-sky-200 bg-white p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                                          Fecha de registro
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-ui-text">
                                          {formatDateTime(candidateResult.user.fecha_registro)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div
                                    className={`rounded-xl p-4 ${
                                      candidateResult.assignment?.can_assign
                                        ? "border border-emerald-200 bg-emerald-50"
                                        : "border border-amber-200 bg-amber-50"
                                    }`}
                                  >
                                    <h5
                                      className={`text-base font-semibold ${
                                        candidateResult.assignment?.can_assign
                                          ? "text-emerald-800"
                                          : "text-amber-800"
                                      }`}
                                    >
                                      Estado de asignación
                                    </h5>

                                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                      <div className="rounded-lg border border-white/80 bg-white p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                          Se puede asignar
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-ui-text">
                                          {candidateResult.assignment?.can_assign ? "Sí" : "No"}
                                        </p>
                                      </div>

                                      <div className="rounded-lg border border-white/80 bg-white p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                          Tiene estancia activa
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-ui-text">
                                          {candidateResult.assignment?.has_active_stay ? "Sí" : "No"}
                                        </p>
                                      </div>

                                      {candidateResult.assignment?.active_stay ? (
                                        <>
                                          <div className="rounded-lg border border-white/80 bg-white p-3 md:col-span-2">
                                            <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                              Piso actual
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-ui-text">
                                              {candidateResult.assignment.active_stay.ciudad || "—"} ·{" "}
                                              {candidateResult.assignment.active_stay.direccion || "—"}
                                            </p>
                                          </div>

                                          <div className="rounded-lg border border-white/80 bg-white p-3 md:col-span-2">
                                            <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                              Habitación actual
                                            </p>
                                            <p className="mt-1 text-sm font-semibold text-ui-text">
                                              {candidateResult.assignment.active_stay.habitacion_titulo || "—"}
                                            </p>
                                          </div>
                                        </>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="card">
                              <div className="card-body space-y-4">
                                <div className="flex items-center justify-between gap-3">
                                  <h5 className="text-lg font-semibold text-ui-text">
                                    Actividad por piso
                                  </h5>
                                  <span className="text-xs text-ui-text-secondary">
                                    Total pisos: {candidatePisoActivity.length}
                                  </span>
                                </div>

                                {candidatePisoActivity.length > 0 ? (
                                  <div className="space-y-4">
                                    {candidatePisoActivity.map((item) => (
                                      <div
                                        key={`candidate-piso-${item.pisoId}`}
                                        className="rounded-xl border border-slate-300 bg-slate-50 p-4"
                                      >
                                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                                          <div>
                                            <p className="text-sm font-semibold text-ui-text">
                                              Piso #{item.piso?.id || item.pisoId}
                                            </p>
                                            <p className="mt-1 text-sm text-ui-text-secondary">
                                              {item.piso?.ciudad || "—"} · {item.piso?.direccion || "—"}
                                            </p>
                                          </div>

                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="badge badge-neutral">
                                              Estancias: {item.estancias.length}
                                            </span>
                                            <span className="badge badge-neutral">
                                              Votos: {item.reputacion?.total_votos ?? 0}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                                          <CompactMetricCard
                                            title="Limpieza"
                                            value={formatMetric(item.reputacion?.medias?.limpieza)}
                                            tone="success"
                                          />
                                          <CompactMetricCard
                                            title="Ruido"
                                            value={formatMetric(item.reputacion?.medias?.ruido)}
                                            tone="warning"
                                          />
                                          <CompactMetricCard
                                            title="Pagos"
                                            value={formatMetric(
                                              item.reputacion?.medias?.puntualidad_pagos
                                            )}
                                            tone="info"
                                          />
                                          <CompactMetricCard
                                            title="Últ. voto"
                                            value={
                                              item.reputacion?.last_vote_at
                                                ? formatDate(item.reputacion.last_vote_at)
                                                : "—"
                                            }
                                            tone="violet"
                                          />
                                        </div>

                                        <div className="mt-4 rounded-xl border border-white/80 bg-white p-4">
                                          <div className="flex items-center justify-between gap-3">
                                            <h6 className="text-sm font-semibold text-ui-text">
                                              Estancias en este piso
                                            </h6>
                                            <span className="text-xs text-ui-text-secondary">
                                              {item.estancias.length} registradas
                                            </span>
                                          </div>

                                          {item.estancias.length > 0 ? (
                                            <div className="mt-4 space-y-3">
                                              {item.estancias.map((stay) => (
                                                <div
                                                  key={stay.usuario_habitacion_id}
                                                  className="rounded-lg border border-slate-200 bg-slate-50/80 p-3"
                                                >
                                                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                    <div>
                                                      <p className="text-sm font-semibold text-ui-text">
                                                        {stay.habitacion_titulo || `Habitación #${stay.habitacion_id}`}
                                                      </p>

                                                      <p className="mt-1 text-xs text-ui-text-secondary">
                                                        Entrada: {formatDateTime(stay.fecha_entrada)}
                                                      </p>

                                                      <p className="mt-1 text-xs text-ui-text-secondary">
                                                        Salida:{" "}
                                                        {stay.fecha_salida
                                                          ? formatDateTime(stay.fecha_salida)
                                                          : "Activa"}
                                                      </p>
                                                    </div>

                                                    <span className={getStayStateBadgeClass(stay.estado)}>
                                                      {getStayStateLabel(stay.estado)}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="mt-3 text-sm text-ui-text-secondary">
                                              Sin estancias registradas en este piso.
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="rounded-xl border border-slate-300 bg-slate-50">
                                    <div className="card-body">
                                      <p className="text-sm text-ui-text-secondary">
                                        Este usuario todavía no tiene actividad registrada por piso.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </section>
                ) : null}

                {activeTab === "historial" ? (
                  <section className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                        Historial de la habitación
                      </h3>
                      <p className="mt-1 text-sm text-ui-text-secondary">
                        Revisa qué personas han vivido en esta habitación y su reputación agregada.
                      </p>
                    </div>

                    {historialError ? (
                      <div className="alert-error">{historialError}</div>
                    ) : null}

                    {loadingHistorial ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div className="skeleton h-24 w-full" />
                          <div className="skeleton h-24 w-full" />
                          <div className="skeleton h-24 w-full" />
                        </div>

                        <div className="space-y-4">
                          {Array.from({ length: 2 }).map((_, index) => (
                            <div key={index} className="card">
                              <div className="card-body space-y-4">
                                <div className="flex items-center gap-4">
                                  <div className="skeleton h-14 w-14 rounded-full" />
                                  <div className="space-y-2">
                                    <div className="skeleton h-5 w-40" />
                                    <div className="skeleton h-4 w-56" />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                  <div className="skeleton h-20 rounded-lg" />
                                  <div className="skeleton h-20 rounded-lg" />
                                  <div className="skeleton h-20 rounded-lg" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : historialItems.length === 0 ? (
                      <div className="card">
                        <div className="card-body">
                          <p className="text-sm text-ui-text-secondary">
                            Esta habitación todavía no tiene historial registrado.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {historialItems.map((item) => {
                          const usuario = getHistorialUser(item);
                          const reputacionGlobal = normalizeSummary(getHistorialReputationGlobal(item));
                          const reputacionPiso = normalizeSummary(getHistorialReputationPiso(item));
                          const displayName = formatDisplayName(usuario);
                          const stayState = item?.estado || (item?.es_actual ? "active" : null);

                          return (
                            <article
                              key={item?.usuario_habitacion_id || `${usuario?.id}-${item?.fecha_entrada || ""}`}
                              className="card"
                            >
                              <div className="card-body space-y-5">
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                  <div className="flex items-center gap-4">
                                    {buildPersonAvatar(usuario, {
                                      onOpen: openHistorialPhotoModal,
                                    })}

                                    <div className="space-y-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="text-lg font-semibold text-ui-text">
                                          {displayName}
                                        </h4>

                                        <span className={getStayStateBadgeClass(stayState)}>
                                          {getStayStateLabel(stayState)}
                                        </span>

                                        {item?.es_actual ? (
                                          <span className="badge badge-success">
                                            Ocupante actual
                                          </span>
                                        ) : null}
                                      </div>

                                      <p className="text-sm text-ui-text-secondary">
                                        {usuario?.email || "Sin email"}
                                      </p>

                                      <p className="text-sm text-ui-text-secondary">
                                        {usuario?.telefono || "Sin teléfono"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-sm text-ui-text-secondary">
                                    <p>
                                      <span className="font-medium text-ui-text">Entrada:</span>{" "}
                                      {formatDateTime(item?.fecha_entrada)}
                                    </p>
                                    <p className="mt-1">
                                      <span className="font-medium text-ui-text">Salida:</span>{" "}
                                      {item?.fecha_salida
                                        ? formatDateTime(item.fecha_salida)
                                        : "Activa"}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                      <h5 className="text-base font-semibold text-violet-800">
                                        Reputación global
                                      </h5>
                                      <span className="badge badge-neutral">
                                        {reputacionGlobal.total_votos} votos
                                      </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                                          Limpieza
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-ui-text">
                                          {formatMetric(reputacionGlobal.limpieza)}
                                        </p>
                                      </div>

                                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                                          Ruido
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-ui-text">
                                          {formatMetric(reputacionGlobal.ruido)}
                                        </p>
                                      </div>

                                      <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                                          Pagos
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-ui-text">
                                          {formatMetric(reputacionGlobal.puntualidad_pagos)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                      <h5 className="text-base font-semibold text-sky-800">
                                        Reputación en este piso
                                      </h5>
                                      <span className="badge badge-neutral">
                                        {reputacionPiso.total_votos} votos
                                      </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                                          Limpieza
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-ui-text">
                                          {formatMetric(reputacionPiso.limpieza)}
                                        </p>
                                      </div>

                                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                                          Ruido
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-ui-text">
                                          {formatMetric(reputacionPiso.ruido)}
                                        </p>
                                      </div>

                                      <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                                          Pagos
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-ui-text">
                                          {formatMetric(reputacionPiso.puntualidad_pagos)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
                                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <div>
                                      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                        Inicio estancia
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-ui-text">
                                        {formatDate(item?.fecha_entrada)}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                        Fin estancia
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-ui-text">
                                        {item?.fecha_salida ? formatDate(item.fecha_salida) : "Activa"}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                        Estado
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-ui-text">
                                        {getStayStateLabel(stayState)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
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
        open={isAssignModalOpen}
        title="Confirmar asignación"
        onClose={closeAssignModal}
        size="md"
        tone="info"
        closeLabel="Cancelar"
        closeOnOverlay={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-ui-text-secondary">
            Vas a asignar este usuario a la habitación actual.
          </p>

          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
            <p className="text-sm font-semibold text-sky-800">
              {formatDisplayName(candidateResult?.user)}
            </p>
            <p className="mt-1 text-sm text-sky-800">
              {candidateResult?.user?.email || "—"}
            </p>
            <p className="mt-1 text-sm text-sky-800">
              Habitación: {habitacion?.titulo || `#${habitacionId}`}
            </p>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-800">
              Al confirmar, la estancia activa se creará y la habitación pasará a no disponible.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeAssignModal}
              disabled={assigningUser}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn btn-sm border border-sky-300 bg-sky-100 text-sky-800 hover:bg-sky-200"
              onClick={handleAssignUserToRoom}
              disabled={assigningUser}
            >
              {assigningUser ? "Asignando..." : "Sí, asignar"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isRemoveOccupantModalOpen}
        title="Confirmar salida de la habitación"
        onClose={closeRemoveOccupantModal}
        size="md"
        tone="danger"
        closeLabel="Cancelar"
        closeOnOverlay={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-ui-text-secondary">
            Vas a quitar a este usuario de la habitación actual.
          </p>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              {formatDisplayName(currentOccupant)}
            </p>
            <p className="mt-1 text-sm text-red-700">
              Habitación: {habitacion?.titulo || `#${habitacionId}`}
            </p>
            <p className="mt-1 text-sm text-red-700">
              Entrada: {formatDateTime(currentOccupant?.fecha_entrada)}
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              Esta acción cerrará la estancia activa del usuario y volverá a dejar la habitación como disponible.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeRemoveOccupantModal}
              disabled={removingOccupant}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleRemoveOccupantFromRoom}
              disabled={removingOccupant}
            >
              {removingOccupant ? "Quitando..." : "Sí, quitar"}
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

      <Modal
        open={isHistorialPhotoModalOpen}
        title="Foto de perfil"
        onClose={closeHistorialPhotoModal}
        size="default"
        closeLabel="Cerrar"
      >
        {selectedHistorialPhoto.url ? (
          <div className="space-y-4">
            <img
              src={selectedHistorialPhoto.url}
              alt={selectedHistorialPhoto.alt || "Foto de perfil"}
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
