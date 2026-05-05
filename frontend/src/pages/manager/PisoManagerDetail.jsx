import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { getApiErrorMessage } from "../../services/apiClient.js";
import {
  addAdminPisoFoto,
  deleteAdminPisoFoto,
  getAdminPisoById,
  getAdminPisoConvivenciaActual,
  listAdminHabitacionesByPiso,
  updateAdminPiso,
  updateAdminPisoFoto,
} from "../../services/adminPisoService.js";
import {
  createAdminHabitacion,
  deactivateAdminHabitacion,
  reactivateAdminHabitacion,
} from "../../services/adminHabitacionService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const EMPTY_PISO_UPLOAD_FORM = {
  foto: null,
  orden: "",
};

const EMPTY_PISO_FORM = {
  direccion: "",
  ciudad: "",
  codigo_postal: "",
  descripcion: "",
};

const EMPTY_HABITACION_FORM = {
  titulo: "",
  descripcion: "",
  precio_mensual: "",
  disponible: "true",
  tamano_m2: "",
  amueblada: "false",
  bano: "false",
  balcon: "false",
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

function formatMetric(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(1);
}

function buildPisoFormFromPiso(piso) {
  if (!piso) return EMPTY_PISO_FORM;

  return {
    direccion: piso.direccion || "",
    ciudad: piso.ciudad || "",
    codigo_postal: piso.codigo_postal || "",
    descripcion: piso.descripcion || "",
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

function getMetricVoteItems(reputacionActual, metricKey) {
  if (!reputacionActual?.detalle_votos) return [];
  const items = reputacionActual.detalle_votos[metricKey];
  return Array.isArray(items) ? items : [];
}

function MiniVoteList({ items = [], onOpen }) {
  if (!items.length) {
    return (
      <p className="mt-2 text-xs text-ui-text-secondary">
        Sin votos actuales.
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => {
        const voterName = formatDisplayName(item.votante);
        const voterPhoto = buildImageUrl(item.votante?.foto_perfil_url);

        return (
          <div
            key={`${item.voto_id}-${item.votante?.id}-${item.valor}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white px-2 py-1 shadow-sm"
            title={voterName}
          >
            {voterPhoto ? (
              <button
                type="button"
                className="block cursor-pointer rounded-full"
                onClick={() => onOpen?.(voterPhoto, voterName)}
                aria-label={`Ver foto de ${voterName}`}
                title={voterName}
              >
                <img
                  src={voterPhoto}
                  alt={voterName}
                  className="h-6 w-6 rounded-full object-cover"
                />
              </button>
            ) : (
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-ui-text-secondary"
                title={voterName}
              >
                {getInitials(item.votante)}
              </div>
            )}

            <span className="text-xs font-semibold text-ui-text">
              {item.valor}/5
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DisclosureChevron({ open = false }) {
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-ui-border bg-white text-ui-text transition-transform ${
        open ? "rotate-180" : ""
      }`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 20 20"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M6 8l4 4 4-4" />
      </svg>
    </span>
  );
}

function getCompactMetricToneClasses(tone = "default", strong = false) {
  if (tone === "fuchsia") {
    return strong
      ? "border-fuchsia-400 bg-fuchsia-50"
      : "border-fuchsia-300 bg-fuchsia-50";
  }

  if (tone === "emerald") {
    return "border-emerald-300 bg-emerald-50";
  }

  if (tone === "amber") {
    return "border-amber-300 bg-amber-50";
  }

  if (tone === "sky") {
    return "border-sky-300 bg-sky-50";
  }

  if (tone === "violet") {
    return "border-violet-300 bg-violet-50";
  }

  return "border-slate-300 bg-slate-50";
}

function CompactMetricCard({
  label,
  value,
  tone = "default",
  strong = false,
}) {
  return (
    <div
      className={`rounded-2xl border p-2.5 sm:p-3 ${getCompactMetricToneClasses(
        tone,
        strong
      )}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-ui-text-secondary">
        {label}
      </p>
      <p className="mt-1 text-base font-bold text-ui-text sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function TabButton({ active, label, badge, onClick, mobile = false }) {
  if (mobile) {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        className={`flex min-w-[148px] items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
          active
            ? "border-brand-primary bg-blue-50 text-brand-primary shadow-sm"
            : "border-slate-300 bg-white text-ui-text shadow-sm"
        }`}
        onClick={onClick}
      >
        <span className="font-semibold">{label}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            active
              ? "bg-blue-100 text-brand-primary"
              : "bg-slate-100 text-ui-text-secondary"
          }`}
        >
          {badge}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`flex items-center justify-between border px-4 py-3 text-left transition-all duration-200 ${
        active
          ? "relative z-10 -mb-px rounded-t-2xl rounded-b-none border-slate-300 border-b-white bg-white text-brand-primary shadow-sm"
          : "cursor-pointer rounded-xl border-slate-400 bg-white text-ui-text shadow-sm hover:-translate-y-0.5 hover:border-brand-primary hover:bg-blue-50/60 hover:text-brand-primary hover:shadow-md"
      }`}
      onClick={onClick}
    >
      <span className="font-semibold">{label}</span>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          active
            ? "bg-blue-100 text-brand-primary"
            : "bg-slate-100 text-ui-text-secondary"
        }`}
      >
        {badge}
      </span>
    </button>
  );
}

export default function PisoManagerDetail() {
  const { pisoId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("habitaciones");
  const [openConvivienteId, setOpenConvivienteId] = useState(null);

  const [piso, setPiso] = useState(null);
  const [habitaciones, setHabitaciones] = useState([]);
  const [fotosPiso, setFotosPiso] = useState([]);
  const [pisoForm, setPisoForm] = useState(EMPTY_PISO_FORM);
  const [pisoUploadForm, setPisoUploadForm] = useState(EMPTY_PISO_UPLOAD_FORM);
  const [pisoPhotoOrderValues, setPisoPhotoOrderValues] = useState({});
  const [habitacionForm, setHabitacionForm] = useState(EMPTY_HABITACION_FORM);

  const [creatingHabitacion, setCreatingHabitacion] = useState(false);
  const [savingPiso, setSavingPiso] = useState(false);
  const [editPisoFeedback, setEditPisoFeedback] = useState(null);
  const [isCreateHabitacionOpen, setIsCreateHabitacionOpen] = useState(false);
  const [createHabitacionSuccess, setCreateHabitacionSuccess] = useState("");

  const [loading, setLoading] = useState(true);
  const [changingId, setChangingId] = useState(null);
  const [habitacionToDeactivate, setHabitacionToDeactivate] = useState(null);

  const [isDraggingPisoPhoto, setIsDraggingPisoPhoto] = useState(false);
  const [uploadingPisoPhoto, setUploadingPisoPhoto] = useState(false);
  const [updatingPisoPhotoId, setUpdatingPisoPhotoId] = useState(null);
  const [deletingPisoPhotoId, setDeletingPisoPhotoId] = useState(null);
  const [pisoPhotoToDelete, setPisoPhotoToDelete] = useState(null);
  const [pisoPhotoFeedback, setPisoPhotoFeedback] = useState({});
  const [editingPisoPhotoOrderId, setEditingPisoPhotoOrderId] = useState(null);
  const [openPisoPhotoMenuId, setOpenPisoPhotoMenuId] = useState(null);

  const [openHabitacionMenuId, setOpenHabitacionMenuId] = useState(null);
  const [habitacionCardFeedback, setHabitacionCardFeedback] = useState({});

  const [isPisoPhotoModalOpen, setIsPisoPhotoModalOpen] = useState(false);
  const [selectedPisoPhotoIndex, setSelectedPisoPhotoIndex] = useState(0);

  const [convivenciaResumen, setConvivenciaResumen] = useState(null);
  const [convivientesActuales, setConvivientesActuales] = useState([]);
  const [loadingConvivencia, setLoadingConvivencia] = useState(false);
  const [convivenciaError, setConvivenciaError] = useState("");

  const [isConvivientePhotoModalOpen, setIsConvivientePhotoModalOpen] =
    useState(false);
  const [selectedConvivientePhoto, setSelectedConvivientePhoto] = useState({
    url: "",
    alt: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        setSuccess("");
        setCreateHabitacionSuccess("");

        const [pisoData, habitacionesData] = await Promise.all([
          getAdminPisoById(pisoId),
          listAdminHabitacionesByPiso(pisoId),
        ]);

        if (!isMounted) return;

        const nextPiso = pisoData?.piso || null;

        setPiso(nextPiso);
        setPisoForm(buildPisoFormFromPiso(nextPiso));
        setHabitaciones(
          Array.isArray(habitacionesData?.items) ? habitacionesData.items : []
        );
        setFotosPiso(Array.isArray(pisoData?.fotos) ? pisoData.fotos : []);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudo cargar el detalle del piso.");
        setPiso(null);
        setPisoForm(EMPTY_PISO_FORM);
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

  useEffect(() => {
    let isMounted = true;

    async function loadConvivencia() {
      try {
        setLoadingConvivencia(true);
        setConvivenciaError("");

        const data = await getAdminPisoConvivenciaActual(pisoId);

        if (!isMounted) return;

        setConvivenciaResumen(data?.resumen || null);
        setConvivientesActuales(
          Array.isArray(data?.convivientes) ? data.convivientes : []
        );
      } catch (err) {
        if (!isMounted) return;
        setConvivenciaError(
          err?.message || "No se pudo cargar la convivencia actual del piso."
        );
        setConvivenciaResumen(null);
        setConvivientesActuales([]);
      } finally {
        if (isMounted) setLoadingConvivencia(false);
      }
    }

    loadConvivencia();

    return () => {
      isMounted = false;
    };
  }, [pisoId]);

  function handleSelectTab(nextTab) {
    setActiveTab(nextTab);
    setOpenPisoPhotoMenuId(null);
    setOpenHabitacionMenuId(null);

    if (nextTab !== "fotos") {
      setEditingPisoPhotoOrderId(null);
    }
  }

  function toggleConvivienteCard(convivienteId) {
    setOpenConvivienteId((prev) =>
      prev === convivienteId ? null : convivienteId
    );
  }

  function handlePisoFormChange(event) {
    const { name, value } = event.target;
    setPisoForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetPisoForm() {
    setPisoForm(buildPisoFormFromPiso(piso));
  }

  function closeEditPisoTab() {
    if (savingPiso) return;
    resetPisoForm();
    setEditPisoFeedback(null);
    handleSelectTab("habitaciones");
  }

  async function handleUpdatePiso(event) {
    event.preventDefault();

    try {
      setSavingPiso(true);
      setEditPisoFeedback(null);

      const payload = {
        direccion: pisoForm.direccion.trim(),
        ciudad: pisoForm.ciudad.trim(),
        codigo_postal: pisoForm.codigo_postal.trim() || null,
        descripcion: pisoForm.descripcion.trim() || null,
      };

      const data = await updateAdminPiso(pisoId, payload);
      const updatedPiso = data?.piso || null;

      if (!updatedPiso) {
        throw new Error("No se pudo actualizar el piso.");
      }

      setPiso((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          direccion: updatedPiso.direccion,
          ciudad: updatedPiso.ciudad,
          codigo_postal: updatedPiso.codigo_postal,
          descripcion: updatedPiso.descripcion,
          activo: updatedPiso.activo,
          updated_at: updatedPiso.updated_at,
        };
      });

      setPisoForm(buildPisoFormFromPiso(updatedPiso));
      setEditPisoFeedback({
        type: "success",
        message: "Piso actualizado correctamente.",
      });
    } catch (err) {
      setEditPisoFeedback({
        type: "error",
        message: getApiErrorMessage(err, "No se pudo actualizar el piso."),
      });
    } finally {
      setSavingPiso(false);
    }
  }

  function handleHabitacionFormChange(event) {
    const { name, value } = event.target;
    setHabitacionForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetHabitacionForm() {
    setHabitacionForm(EMPTY_HABITACION_FORM);
  }

  function openCreateHabitacionForm() {
    setError("");
    setCreateHabitacionSuccess("");
    setIsCreateHabitacionOpen(true);
  }

  function closeCreateHabitacionForm() {
    if (creatingHabitacion) return;
    resetHabitacionForm();
    setCreateHabitacionSuccess("");
    setIsCreateHabitacionOpen(false);
  }

  async function handleCreateHabitacion(event) {
    event.preventDefault();

    try {
      setCreatingHabitacion(true);
      setError("");
      setSuccess("");
      setCreateHabitacionSuccess("");

      const payload = {
        piso_id: Number(pisoId),
        titulo: habitacionForm.titulo.trim(),
        descripcion: habitacionForm.descripcion.trim(),
        precio_mensual: Number(habitacionForm.precio_mensual),
        disponible: habitacionForm.disponible === "true",
        tamano_m2:
          habitacionForm.tamano_m2 === ""
            ? null
            : Number(habitacionForm.tamano_m2),
        amueblada: habitacionForm.amueblada === "true",
        bano: habitacionForm.bano === "true",
        balcon: habitacionForm.balcon === "true",
      };

      const data = await createAdminHabitacion(payload);
      const nuevaHabitacion = data?.habitacion || null;

      if (!nuevaHabitacion) {
        throw new Error("No se pudo crear la habitación.");
      }

      setHabitaciones((prev) => [nuevaHabitacion, ...prev]);

      setPiso((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          habitaciones_total: Number(prev.habitaciones_total ?? 0) + 1,
          habitaciones_activas: Number(prev.habitaciones_activas ?? 0) + 1,
          habitaciones_disponibles: nuevaHabitacion.disponible
            ? Number(prev.habitaciones_disponibles ?? 0) + 1
            : Number(prev.habitaciones_disponibles ?? 0),
        };
      });

      resetHabitacionForm();
      setIsCreateHabitacionOpen(false);
      setCreateHabitacionSuccess("Habitación creada correctamente.");
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo crear la habitación."));
    } finally {
      setCreatingHabitacion(false);
    }
  }

  function togglePisoPhotoMenu(fotoId, event) {
    event.stopPropagation();
    setOpenHabitacionMenuId(null);
    setOpenPisoPhotoMenuId((prev) => (prev === fotoId ? null : fotoId));
  }

  function openPisoPhotoOrderEditor(fotoId, event) {
    event.stopPropagation();
    setOpenPisoPhotoMenuId(null);

    setPisoPhotoFeedback((prev) => {
      const next = { ...prev };
      delete next[fotoId];
      return next;
    });

    setEditingPisoPhotoOrderId(fotoId);
  }

  function closePisoPhotoOrderEditor(fotoId, event) {
    if (event) event.stopPropagation();

    setEditingPisoPhotoOrderId(null);

    setPisoPhotoFeedback((prev) => {
      const next = { ...prev };
      delete next[fotoId];
      return next;
    });
  }

  function toggleHabitacionMenu(habitacionId, event) {
    event.stopPropagation();
    setOpenPisoPhotoMenuId(null);
    setOpenHabitacionMenuId((prev) =>
      prev === habitacionId ? null : habitacionId
    );
  }

  function openHabitacionDetail(habitacionId) {
    setOpenHabitacionMenuId(null);
    navigate(`/manager/habitacion/${habitacionId}`);
  }

  async function handleReactivateHabitacion(habitacion, event) {
    if (event) event.stopPropagation();

    try {
      setChangingId(habitacion.id);
      setError("");
      setSuccess("");
      setCreateHabitacionSuccess("");
      setOpenHabitacionMenuId(null);

      setHabitacionCardFeedback((prev) => {
        const next = { ...prev };
        delete next[habitacion.id];
        return next;
      });

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
        const becomesAvailableAndActive =
          !habitacion.activo && habitacion.disponible;

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

      setHabitacionCardFeedback((prev) => ({
        ...prev,
        [habitacion.id]: {
          type: "success",
          message: "Habitación reactivada correctamente.",
        },
      }));
    } catch (err) {
      setHabitacionCardFeedback((prev) => ({
        ...prev,
        [habitacion.id]: {
          type: "error",
          message: getApiErrorMessage(
            err,
            "No se pudo reactivar la habitación."
          ),
        },
      }));
    } finally {
      setChangingId(null);
    }
  }

  function requestDeactivateHabitacion(habitacion, event) {
    if (event) event.stopPropagation();
    setOpenHabitacionMenuId(null);
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
      setCreateHabitacionSuccess("");

      setHabitacionCardFeedback((prev) => {
        const next = { ...prev };
        delete next[habitacion.id];
        return next;
      });

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
        const wasAvailableAndActive = Boolean(
          habitacion.activo && habitacion.disponible
        );

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

      setHabitacionCardFeedback((prev) => ({
        ...prev,
        [habitacion.id]: {
          type: "success",
          message: "Habitación desactivada correctamente.",
        },
      }));

      setHabitacionToDeactivate(null);
    } catch (err) {
      const message =
        err?.error === "ROOM_OCCUPIED"
          ? "No puedes desactivar esta habitación mientras esté ocupada."
          : getApiErrorMessage(err, "No se pudo desactivar la habitación.");

      setHabitacionCardFeedback((prev) => ({
        ...prev,
        [habitacion.id]: {
          type: "error",
          message,
        },
      }));

      setError(message);
      setHabitacionToDeactivate(null);
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
    setOpenPisoPhotoMenuId(null);
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
      setError(getApiErrorMessage(err, "No se pudo subir la foto del piso."));
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

      setEditingPisoPhotoOrderId(null);

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

  function requestDeletePisoPhoto(foto, event) {
    if (event) event.stopPropagation();
    setOpenPisoPhotoMenuId(null);
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

      setPisoPhotoFeedback((prev) => {
        const next = { ...prev };
        delete next[pisoPhotoToDelete.id];
        return next;
      });

      await deleteAdminPisoFoto(pisoId, pisoPhotoToDelete.id);

      setFotosPiso((prev) =>
        prev.filter((foto) => foto.id !== pisoPhotoToDelete.id)
      );

      if (editingPisoPhotoOrderId === pisoPhotoToDelete.id) {
        setEditingPisoPhotoOrderId(null);
      }

      setPisoPhotoToDelete(null);
    } catch (err) {
      setPisoPhotoFeedback((prev) => ({
        ...prev,
        [pisoPhotoToDelete.id]: {
          type: "error",
          message: getApiErrorMessage(
            err,
            "No se pudo eliminar la foto del piso."
          ),
        },
      }));
    } finally {
      setDeletingPisoPhotoId(null);
    }
  }

  function openConvivientePhotoModal(url, alt) {
    if (!url) return;
    setSelectedConvivientePhoto({ url, alt });
    setIsConvivientePhotoModalOpen(true);
  }

  function closeConvivientePhotoModal() {
    setSelectedConvivientePhoto({ url: "", alt: "" });
    setIsConvivientePhotoModalOpen(false);
  }

  const cover = buildImageUrl(piso?.cover_foto_piso_url);
  const habitacionCount = Number(piso?.habitaciones_total ?? habitaciones.length);
  const fotoCount = fotosPiso.length;

  const panelClassName =
    activeTab === "habitaciones"
      ? "rounded-2xl border border-slate-300 bg-white p-4 md:rounded-b-2xl md:rounded-tr-2xl md:rounded-tl-none md:p-5"
      : activeTab === "editar"
        ? "rounded-2xl border border-slate-300 bg-white p-4 md:rounded-b-2xl md:rounded-tl-2xl md:rounded-tr-none md:p-5"
        : "rounded-2xl border border-slate-300 bg-white p-4 md:rounded-b-2xl md:rounded-tl-2xl md:rounded-tr-2xl md:p-5";

  return (
    <>
      <PageShell
        title="Detalle del piso"
        subtitle="Consulta información del piso, sus fotos, sus habitaciones y su convivencia actual."
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

            <div className="rounded-2xl border border-slate-300 bg-white p-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <div className="skeleton h-11 w-full rounded-xl" />
                <div className="skeleton h-11 w-full rounded-xl" />
                <div className="skeleton h-11 w-full rounded-xl" />
                <div className="skeleton h-11 w-full rounded-xl" />
              </div>
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
                      className="aspect-[16/7] w-full rounded-lg object-cover sm:aspect-[16/6]"
                    />
                  </button>
                ) : (
                  <div className="skeleton aspect-[16/7] w-full rounded-lg sm:aspect-[16/6]" />
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

                  <span
                    className={
                      piso.activo ? "badge badge-success" : "badge badge-neutral"
                    }
                  >
                    {piso.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <p className="text-sm text-ui-text-secondary">
                  {piso.descripcion || "Sin descripción."}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="md:hidden">
                <div className="responsive-scroll">
                  <div
                    role="tablist"
                    aria-label="Secciones del detalle del piso"
                    className="flex gap-2 pb-1"
                  >
                    <TabButton
                      mobile
                      active={activeTab === "habitaciones"}
                      label="Habitaciones"
                      badge={habitacionCount}
                      onClick={() => handleSelectTab("habitaciones")}
                    />
                    <TabButton
                      mobile
                      active={activeTab === "fotos"}
                      label="Fotos"
                      badge={fotoCount}
                      onClick={() => handleSelectTab("fotos")}
                    />
                    <TabButton
                      mobile
                      active={activeTab === "convivencia"}
                      label="Convivencia"
                      badge={convivientesActuales.length}
                      onClick={() => handleSelectTab("convivencia")}
                    />
                    <TabButton
                      mobile
                      active={activeTab === "editar"}
                      label="Editar"
                      badge="Form"
                      onClick={() => handleSelectTab("editar")}
                    />
                  </div>
                </div>
              </div>

              <div
                role="tablist"
                aria-label="Secciones del detalle del piso"
                className="hidden grid-cols-1 gap-2 md:grid md:grid-cols-4"
              >
                <TabButton
                  active={activeTab === "habitaciones"}
                  label="Habitaciones del piso"
                  badge={habitacionCount}
                  onClick={() => handleSelectTab("habitaciones")}
                />
                <TabButton
                  active={activeTab === "fotos"}
                  label="Fotos del piso"
                  badge={fotoCount}
                  onClick={() => handleSelectTab("fotos")}
                />
                <TabButton
                  active={activeTab === "convivencia"}
                  label="Convivencia"
                  badge={convivientesActuales.length}
                  onClick={() => handleSelectTab("convivencia")}
                />
                <TabButton
                  active={activeTab === "editar"}
                  label="Editar piso"
                  badge="Formulario"
                  onClick={() => handleSelectTab("editar")}
                />
              </div>

              <div className={panelClassName}>
                {activeTab === "editar" ? (
                  <section className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                        Editar piso
                      </h3>
                      <p className="mt-1 text-sm text-ui-text-secondary">
                        Actualiza los datos principales del piso.
                      </p>
                    </div>

                    {editPisoFeedback ? (
                      <div
                        className={
                          editPisoFeedback.type === "success"
                            ? "alert-success"
                            : "alert-error"
                        }
                      >
                        {editPisoFeedback.message}
                      </div>
                    ) : null}

                    <form className="space-y-4" onSubmit={handleUpdatePiso}>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                            disabled={savingPiso}
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
                            disabled={savingPiso}
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
                            disabled={savingPiso}
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
                            disabled={savingPiso}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <button
                          type="button"
                          className="btn border border-rose-300 bg-rose-100 text-rose-800 hover:bg-rose-200"
                          onClick={closeEditPisoTab}
                          disabled={savingPiso}
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          className="btn border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200"
                          onClick={resetPisoForm}
                          disabled={savingPiso}
                        >
                          Restablecer
                        </button>

                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={savingPiso}
                          aria-busy={savingPiso}
                        >
                          {savingPiso ? "Guardando..." : "Guardar cambios"}
                        </button>
                      </div>
                    </form>
                  </section>
                ) : null}

                {activeTab === "fotos" ? (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                        Fotos del piso
                      </h3>
                      <span className="text-xs text-ui-text-secondary">
                        Total: {fotosPiso.length}
                      </span>
                    </div>

                    <div className="card">
                      <div className="card-body space-y-4">
                        <div>
                          <h4 className="text-base font-semibold text-ui-text">
                            Añadir foto del piso
                          </h4>
                          <p className="mt-1 text-sm text-ui-text-secondary">
                            Selecciona o arrastra una imagen para subirla a este
                            piso.
                          </p>
                        </div>

                        {uploadingPisoPhoto ? (
                          <div className="flex justify-end">
                            <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
                              Subiendo foto del piso...
                            </div>
                          </div>
                        ) : null}

                        <form
                          className="space-y-4"
                          onSubmit={(e) => e.preventDefault()}
                        >
                          <label
                            htmlFor="foto-piso"
                            onDragOver={handlePisoPhotoDragOver}
                            onDragLeave={handlePisoPhotoDragLeave}
                            onDrop={handlePisoPhotoDrop}
                            className={`flex min-h-[160px] cursor-pointer items-center justify-center rounded-lg border-[3px] border-dashed px-4 py-6 text-center transition-colors ${
                              isDraggingPisoPhoto
                                ? "border-emerald-300 bg-emerald-100"
                                : "border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100"
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
                        {fotosPiso.map((foto, index) => (
                          <article key={foto.id} className="card card-hover relative">
                            <button
                              type="button"
                              className="absolute right-[10px] top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-sky-300 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white shadow-[0_0_0_3px_rgba(96,165,250,0.35)] transition-all hover:from-sky-500 hover:via-blue-600 hover:to-indigo-700 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.4)]"
                              onClick={(event) => togglePisoPhotoMenu(foto.id, event)}
                              aria-label="Más acciones"
                            >
                              <span className="flex items-center justify-center gap-0.5">
                                <span className="h-1 w-1 rounded-full bg-white" />
                                <span className="h-1 w-1 rounded-full bg-white" />
                                <span className="h-1 w-1 rounded-full bg-white" />
                              </span>
                            </button>

                            {openPisoPhotoMenuId === foto.id ? (
                              <div
                                className="absolute right-3 top-12 z-30 min-w-[180px] rounded-lg border border-ui-border bg-white p-2 shadow-modal"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ui-text hover:bg-sky-100"
                                  onClick={(event) =>
                                    openPisoPhotoOrderEditor(foto.id, event)
                                  }
                                >
                                  Cambiar orden
                                </button>

                                <button
                                  type="button"
                                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ui-text hover:bg-red-100"
                                  onClick={(event) =>
                                    requestDeletePisoPhoto(foto, event)
                                  }
                                >
                                  Eliminar foto
                                </button>
                              </div>
                            ) : null}

                            <div className="card-body space-y-3">
                              <button
                                type="button"
                                className="block w-full"
                                onClick={() => openPisoPhotoModal(index)}
                              >
                                <img
                                  src={buildImageUrl(foto.url)}
                                  alt={`Foto del piso ${foto.orden}`}
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

                              {editingPisoPhotoOrderId === foto.id ? (
                                <div className="space-y-3">
                                  <div>
                                    <label
                                      className="label"
                                      htmlFor={`orden-piso-foto-${foto.id}`}
                                    >
                                      Orden
                                    </label>
                                    <input
                                      id={`orden-piso-foto-${foto.id}`}
                                      type="number"
                                      min="0"
                                      className="input"
                                      value={pisoPhotoOrderValues[foto.id] ?? ""}
                                      onChange={(event) =>
                                        handlePisoPhotoOrderValueChange(
                                          foto.id,
                                          event.target.value
                                        )
                                      }
                                      disabled={
                                        updatingPisoPhotoId === foto.id ||
                                        deletingPisoPhotoId === foto.id
                                      }
                                    />
                                  </div>

                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={(event) =>
                                        closePisoPhotoOrderEditor(foto.id, event)
                                      }
                                      disabled={
                                        updatingPisoPhotoId === foto.id ||
                                        deletingPisoPhotoId === foto.id
                                      }
                                    >
                                      Cancelar
                                    </button>

                                    <button
                                      type="button"
                                      className="btn btn-sm border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                      disabled={
                                        updatingPisoPhotoId === foto.id ||
                                        deletingPisoPhotoId === foto.id
                                      }
                                      onClick={() => handleSavePisoPhotoOrder(foto)}
                                    >
                                      {updatingPisoPhotoId === foto.id
                                        ? "Guardando..."
                                        : "Guardar orden"}
                                    </button>
                                  </div>
                                </div>
                              ) : null}

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
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                ) : null}

                {activeTab === "convivencia" ? (
                  <section className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                        Convivencia actual
                      </h3>
                      <p className="mt-1 text-sm text-ui-text-secondary">
                        Aquí ves la reputación real de la convivencia actual del
                        piso, sin mezclar votos históricos.
                      </p>
                    </div>

                    {convivenciaError ? (
                      <div className="alert-error">{convivenciaError}</div>
                    ) : null}

                    {loadingConvivencia ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <div
                              key={index}
                              className="rounded-xl border border-slate-300 bg-slate-50 p-4"
                            >
                              <div className="skeleton h-4 w-2/3" />
                              <div className="mt-3 skeleton h-8 w-1/2" />
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                          {Array.from({ length: 2 }).map((_, index) => (
                            <div key={index} className="card">
                              <div className="card-body space-y-4">
                                <div className="flex items-center gap-4">
                                  <div className="skeleton h-16 w-16 rounded-full" />
                                  <div className="flex-1 space-y-2">
                                    <div className="skeleton h-5 w-1/2" />
                                    <div className="skeleton h-4 w-1/3" />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                  <div className="skeleton h-28 rounded-lg" />
                                  <div className="skeleton h-28 rounded-lg" />
                                  <div className="skeleton h-28 rounded-lg" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="md:hidden">
                          <div className="responsive-scroll">
                            <div className="grid min-w-[620px] grid-cols-5 gap-2 pb-1">
                              <CompactMetricCard
                                label="Global"
                                value={formatMetric(convivenciaResumen?.media_global)}
                                tone="fuchsia"
                                strong
                              />
                              <CompactMetricCard
                                label="Limpieza"
                                value={formatMetric(convivenciaResumen?.medias?.limpieza)}
                                tone="emerald"
                              />
                              <CompactMetricCard
                                label="Ruido"
                                value={formatMetric(convivenciaResumen?.medias?.ruido)}
                                tone="amber"
                              />
                              <CompactMetricCard
                                label="Pagos"
                                value={formatMetric(
                                  convivenciaResumen?.medias?.puntualidad_pagos
                                )}
                                tone="sky"
                              />
                              <CompactMetricCard
                                label="Activos"
                                value={convivenciaResumen?.convivientes_actuales ?? 0}
                                tone="violet"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-5">
                          <div className="rounded-xl border-4 border-fuchsia-400 bg-fuchsia-50">
                            <div className="card-body">
                              <p className="text-xs font-medium uppercase tracking-wide text-fuchsia-600">
                                Media global
                              </p>
                              <p className="mt-2 text-2xl font-bold text-ui-text">
                                {formatMetric(convivenciaResumen?.media_global)}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-emerald-300 bg-emerald-50">
                            <div className="card-body">
                              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                                Limpieza media
                              </p>
                              <p className="mt-2 text-2xl font-bold text-ui-text">
                                {formatMetric(convivenciaResumen?.medias?.limpieza)}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-amber-300 bg-amber-50">
                            <div className="card-body">
                              <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                                Ruido medio
                              </p>
                              <p className="mt-2 text-2xl font-bold text-ui-text">
                                {formatMetric(convivenciaResumen?.medias?.ruido)}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-sky-300 bg-sky-50">
                            <div className="card-body">
                              <p className="text-xs font-medium uppercase tracking-wide text-sky-600">
                                Pagos medios
                              </p>
                              <p className="mt-2 text-2xl font-bold text-ui-text">
                                {formatMetric(
                                  convivenciaResumen?.medias?.puntualidad_pagos
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-violet-300 bg-violet-50">
                            <div className="card-body">
                              <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
                                Convivientes actuales
                              </p>
                              <p className="mt-2 text-2xl font-bold text-ui-text">
                                {convivenciaResumen?.convivientes_actuales ?? 0}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
                          <p className="text-sm font-semibold text-ui-text">
                            Resumen general visible del grupo
                          </p>

                          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <p className="text-sm text-ui-text-secondary">
                              Media global actual del piso:{" "}
                              <span className="font-semibold text-ui-text">
                                {formatMetric(convivenciaResumen?.media_global)}
                              </span>
                            </p>

                            <p className="text-sm text-ui-text-secondary">
                              Total votos actuales entre convivientes:{" "}
                              <span className="font-semibold text-ui-text">
                                {convivenciaResumen?.total_votos_actuales ?? 0}
                              </span>
                            </p>
                          </div>
                        </div>

                        {convivientesActuales.length === 0 ? (
                          <div className="card">
                            <div className="card-body">
                              <p className="text-sm text-ui-text-secondary">
                                Este piso no tiene convivientes activos en este
                                momento.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                            {convivientesActuales.map((conviviente) => {
                              const avatarUrl = buildImageUrl(
                                conviviente.foto_perfil_url
                              );
                              const reputacionActual =
                                conviviente.reputacion_actual || null;

                              const limpiezaVotes = getMetricVoteItems(
                                reputacionActual,
                                "limpieza"
                              );
                              const ruidoVotes = getMetricVoteItems(
                                reputacionActual,
                                "ruido"
                              );
                              const pagosVotes = getMetricVoteItems(
                                reputacionActual,
                                "puntualidad_pagos"
                              );

                              const isOpen = openConvivienteId === conviviente.id;

                              return (
                                <article
                                  key={conviviente.id}
                                  className="card overflow-hidden"
                                >
                                  <div className="card-body space-y-4">
                                    <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-start">
                                      {avatarUrl ? (
                                        <button
                                          type="button"
                                          className="block h-14 w-14 shrink-0 overflow-hidden rounded-full md:h-16 md:w-16"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            openConvivientePhotoModal(
                                              avatarUrl,
                                              [conviviente.nombre, conviviente.apellidos]
                                                .filter(Boolean)
                                                .join(" ") || "Conviviente"
                                            );
                                          }}
                                          aria-label="Ver foto de perfil"
                                        >
                                          <img
                                            src={avatarUrl}
                                            alt={
                                              [conviviente.nombre, conviviente.apellidos]
                                                .filter(Boolean)
                                                .join(" ") || "Conviviente"
                                            }
                                            className="h-14 w-14 rounded-full border border-ui-border object-cover md:h-16 md:w-16"
                                          />
                                        </button>
                                      ) : (
                                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-ui-border bg-slate-100 text-sm font-semibold text-ui-text-secondary md:h-16 md:w-16">
                                          {getInitials(conviviente)}
                                        </div>
                                      )}

                                      <button
                                        type="button"
                                        className="min-w-0 text-left md:pointer-events-none"
                                        onClick={() => toggleConvivienteCard(conviviente.id)}
                                        aria-expanded={isOpen}
                                      >
                                        <div className="min-w-0">
                                          <div className="flex items-start justify-between gap-2 md:block">
                                            <p className="text-base font-semibold text-ui-text md:text-lg">
                                              {[conviviente.nombre, conviviente.apellidos]
                                                .filter(Boolean)
                                                .join(" ") || "Sin nombre"}
                                            </p>

                                            <div className="md:hidden">
                                              <DisclosureChevron open={isOpen} />
                                            </div>
                                          </div>

                                          <p className="mt-1 text-sm text-ui-text-secondary">
                                            Habitación #{conviviente.habitacion_id}
                                            {conviviente.habitacion_titulo
                                              ? ` · ${conviviente.habitacion_titulo}`
                                              : ""}
                                          </p>

                                          <p className="mt-1 text-xs text-ui-text-secondary">
                                            Entrada: {formatDate(conviviente.fecha_entrada)}
                                          </p>

                                          <div className="mt-2 md:hidden">
                                            <span className="badge badge-info">
                                              Total votos:{" "}
                                              {reputacionActual?.total_votos ?? 0}
                                            </span>
                                          </div>
                                        </div>
                                      </button>

                                      <div className="hidden md:flex md:items-start md:gap-2">
                                        <span className="badge badge-info">
                                          Total votos:{" "}
                                          {reputacionActual?.total_votos ?? 0}
                                        </span>
                                      </div>
                                    </div>

                                    <div className={`${isOpen ? "block" : "hidden"} md:block`}>
                                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                                            Limpieza
                                          </p>
                                          <p className="mt-1 text-lg font-semibold text-ui-text">
                                            {formatMetric(reputacionActual?.medias?.limpieza)}
                                          </p>
                                          <MiniVoteList
                                            items={limpiezaVotes}
                                            onOpen={openConvivientePhotoModal}
                                          />
                                        </div>

                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                                            Ruido
                                          </p>
                                          <p className="mt-1 text-lg font-semibold text-ui-text">
                                            {formatMetric(reputacionActual?.medias?.ruido)}
                                          </p>
                                          <MiniVoteList
                                            items={ruidoVotes}
                                            onOpen={openConvivientePhotoModal}
                                          />
                                        </div>

                                        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                                          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                                            Puntualid. pagos
                                          </p>
                                          <p className="mt-1 text-lg font-semibold text-ui-text">
                                            {formatMetric(
                                              reputacionActual?.medias?.puntualidad_pagos
                                            )}
                                          </p>
                                          <MiniVoteList
                                            items={pagosVotes}
                                            onOpen={openConvivientePhotoModal}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </section>
                ) : null}

                {activeTab === "habitaciones" ? (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                        Habitaciones del piso
                      </h3>
                      <span className="text-xs text-ui-text-secondary">
                        Total cargadas: {habitaciones.length}
                      </span>
                    </div>

                    <div className="md:hidden">
                      <div className="grid grid-cols-3 gap-2">
                        <CompactMetricCard
                          label="Totales"
                          value={piso.habitaciones_total ?? 0}
                          tone="amber"
                        />
                        <CompactMetricCard
                          label="Activas"
                          value={piso.habitaciones_activas ?? 0}
                          tone="emerald"
                        />
                        <CompactMetricCard
                          label="Disponibles"
                          value={piso.habitaciones_disponibles ?? 0}
                          tone="sky"
                        />
                      </div>
                    </div>

                    <div className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-3">
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

                    {createHabitacionSuccess ? (
                      <div className="alert-success">
                        {createHabitacionSuccess}
                      </div>
                    ) : null}

                    <div className="space-y-4">
                      {!isCreateHabitacionOpen ? (
                        <div className="flex justify-start">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={openCreateHabitacionForm}
                          >
                            Añadir habitación
                          </button>
                        </div>
                      ) : null}

                      <div
                        className={`overflow-hidden transition-all duration-500 ease-out ${
                          isCreateHabitacionOpen
                            ? "mt-4 max-h-[2000px] translate-y-0 opacity-100"
                            : "max-h-0 -translate-y-3 opacity-0 pointer-events-none"
                        }`}
                      >
                        <div className="card">
                          <div className="card-body space-y-6">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                                  Nueva habitación
                                </h4>
                                <p className="mt-1 text-sm text-ui-text-secondary">
                                  Completa los datos para crear una nueva
                                  habitación en este piso.
                                </p>
                              </div>
                            </div>

                            <form
                              className="space-y-4"
                              onSubmit={handleCreateHabitacion}
                            >
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                  <label className="label" htmlFor="new-titulo">
                                    Título
                                  </label>
                                  <input
                                    id="new-titulo"
                                    name="titulo"
                                    type="text"
                                    className="input"
                                    value={habitacionForm.titulo}
                                    onChange={handleHabitacionFormChange}
                                    disabled={creatingHabitacion}
                                    placeholder="Ej. Habitación luminosa con escritorio"
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label
                                    className="label"
                                    htmlFor="new-descripcion"
                                  >
                                    Descripción
                                  </label>
                                  <textarea
                                    id="new-descripcion"
                                    name="descripcion"
                                    className="textarea"
                                    value={habitacionForm.descripcion}
                                    onChange={handleHabitacionFormChange}
                                    disabled={creatingHabitacion}
                                    placeholder="Describe brevemente la habitación"
                                  />
                                </div>

                                <div>
                                  <label
                                    className="label"
                                    htmlFor="new-precio_mensual"
                                  >
                                    Precio mensual
                                  </label>
                                  <input
                                    id="new-precio_mensual"
                                    name="precio_mensual"
                                    type="number"
                                    min="0"
                                    className="input"
                                    value={habitacionForm.precio_mensual}
                                    onChange={handleHabitacionFormChange}
                                    disabled={creatingHabitacion}
                                  />
                                </div>

                                <div>
                                  <label
                                    className="label"
                                    htmlFor="new-tamano_m2"
                                  >
                                    Tamaño (m²)
                                  </label>
                                  <input
                                    id="new-tamano_m2"
                                    name="tamano_m2"
                                    type="number"
                                    min="1"
                                    className="input"
                                    value={habitacionForm.tamano_m2}
                                    onChange={handleHabitacionFormChange}
                                    disabled={creatingHabitacion}
                                  />
                                </div>

                                <div>
                                  <label
                                    className="label"
                                    htmlFor="new-disponible"
                                  >
                                    Disponibilidad
                                  </label>
                                  <select
                                    id="new-disponible"
                                    name="disponible"
                                    className="select"
                                    value={habitacionForm.disponible}
                                    onChange={handleHabitacionFormChange}
                                    disabled={creatingHabitacion}
                                  >
                                    <option value="true">Disponible</option>
                                    <option value="false">No disponible</option>
                                  </select>
                                </div>

                                <div>
                                  <label
                                    className="label"
                                    htmlFor="new-amueblada"
                                  >
                                    Amueblada
                                  </label>
                                  <select
                                    id="new-amueblada"
                                    name="amueblada"
                                    className="select"
                                    value={habitacionForm.amueblada}
                                    onChange={handleHabitacionFormChange}
                                    disabled={creatingHabitacion}
                                  >
                                    <option value="true">Sí</option>
                                    <option value="false">No</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="label" htmlFor="new-bano">
                                    Baño
                                  </label>
                                  <select
                                    id="new-bano"
                                    name="bano"
                                    className="select"
                                    value={habitacionForm.bano}
                                    onChange={handleHabitacionFormChange}
                                    disabled={creatingHabitacion}
                                  >
                                    <option value="true">Sí</option>
                                    <option value="false">No</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="label" htmlFor="new-balcon">
                                    Balcón
                                  </label>
                                  <select
                                    id="new-balcon"
                                    name="balcon"
                                    className="select"
                                    value={habitacionForm.balcon}
                                    onChange={handleHabitacionFormChange}
                                    disabled={creatingHabitacion}
                                  >
                                    <option value="true">Sí</option>
                                    <option value="false">No</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                                <button
                                  type="button"
                                  className="btn border border-rose-300 bg-rose-100 text-rose-800 hover:bg-rose-200"
                                  onClick={closeCreateHabitacionForm}
                                  disabled={creatingHabitacion}
                                >
                                  Cancelar
                                </button>

                                <button
                                  type="button"
                                  className="btn border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200"
                                  onClick={resetHabitacionForm}
                                  disabled={creatingHabitacion}
                                >
                                  Limpiar
                                </button>

                                <button
                                  type="submit"
                                  className="btn btn-primary"
                                  disabled={creatingHabitacion}
                                  aria-busy={creatingHabitacion}
                                >
                                  {creatingHabitacion
                                    ? "Creando..."
                                    : "Crear habitación"}
                                </button>
                              </div>
                            </form>
                          </div>
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
                          const roomCover = buildImageUrl(
                            habitacion.cover_foto_habitacion_url
                          );
                          const isInactive = !habitacion.activo;

                          return (
                            <article
                              key={habitacion.id}
                              className="card card-hover relative flex h-full flex-col"
                            >
                              <button
                                type="button"
                                className="absolute right-[10px] top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-sky-300 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-white shadow-[0_0_0_3px_rgba(96,165,250,0.35)] transition-all hover:from-sky-500 hover:via-blue-600 hover:to-indigo-700 hover:shadow-[0_0_0_4px_rgba(59,130,246,0.4)]"
                                onClick={(event) =>
                                  toggleHabitacionMenu(habitacion.id, event)
                                }
                                aria-label="Más acciones"
                              >
                                <span className="flex items-center justify-center gap-0.5">
                                  <span className="h-1 w-1 rounded-full bg-white" />
                                  <span className="h-1 w-1 rounded-full bg-white" />
                                  <span className="h-1 w-1 rounded-full bg-white" />
                                </span>
                              </button>

                              {openHabitacionMenuId === habitacion.id ? (
                                <div
                                  className="absolute right-3 top-12 z-30 min-w-[180px] rounded-lg border border-ui-border bg-white p-2 shadow-modal"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {habitacion.activo ? (
                                    <button
                                      type="button"
                                      className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ui-text hover:bg-red-100"
                                      onClick={(event) =>
                                        requestDeactivateHabitacion(
                                          habitacion,
                                          event
                                        )
                                      }
                                    >
                                      Desactivar habitación
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ui-text hover:bg-green-100"
                                      onClick={(event) =>
                                        handleReactivateHabitacion(
                                          habitacion,
                                          event
                                        )
                                      }
                                    >
                                      Reactivar habitación
                                    </button>
                                  )}
                                </div>
                              ) : null}

                              <div className="card-body flex flex-1 flex-col">
                                <div
                                  role="button"
                                  tabIndex={0}
                                  className={`flex flex-1 flex-col gap-3 ${
                                    isInactive ? "opacity-25" : ""
                                  }`}
                                  onClick={() =>
                                    openHabitacionDetail(habitacion.id)
                                  }
                                  onKeyDown={(event) => {
                                    if (
                                      event.key === "Enter" ||
                                      event.key === " "
                                    ) {
                                      event.preventDefault();
                                      openHabitacionDetail(habitacion.id);
                                    }
                                  }}
                                >
                                  {roomCover ? (
                                    <img
                                      src={roomCover}
                                      alt={
                                        habitacion.titulo ||
                                        `Habitación ${habitacion.id}`
                                      }
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
                                          habitacion.activo
                                            ? "badge badge-success"
                                            : "badge badge-neutral"
                                        }
                                      >
                                        {habitacion.activo
                                          ? "Activa"
                                          : "Inactiva"}
                                      </span>

                                      <span
                                        className={
                                          habitacion.disponible
                                            ? "badge badge-info"
                                            : "badge badge-warning"
                                        }
                                      >
                                        {habitacion.disponible
                                          ? "Disponible"
                                          : "No disponible"}
                                      </span>
                                    </div>
                                  </div>

                                  <p className="text-sm text-ui-text-secondary">
                                    <span className="font-medium text-ui-text">
                                      {formatEur(habitacion.precio_mensual)}
                                    </span>{" "}
                                    / mes
                                    {habitacion.tamano_m2
                                      ? ` · ${habitacion.tamano_m2} m²`
                                      : ""}
                                  </p>

                                  <p className="text-xs text-ui-text-secondary">
                                    {habitacion.amueblada ? "Amueblada · " : ""}
                                    {habitacion.bano ? "Baño · " : ""}
                                    {habitacion.balcon ? "Balcón" : ""}
                                  </p>
                                </div>

                                {habitacionCardFeedback[habitacion.id] ? (
                                  <div
                                    className={`mt-4 ${
                                      habitacionCardFeedback[habitacion.id]
                                        .type === "success"
                                        ? "alert-success"
                                        : "alert-error"
                                    }`}
                                  >
                                    {
                                      habitacionCardFeedback[habitacion.id]
                                        .message
                                    }
                                  </div>
                                ) : null}
                              </div>
                            </article>
                          );
                        })}
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
            Vas a desactivar esta habitación y dejará de estar disponible en la
            parte pública.
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
        open={Boolean(pisoPhotoToDelete)}
        title="Confirmar eliminación"
        onClose={closeDeletePisoPhotoModal}
        size="md"
        tone="danger"
        closeLabel="Cancelar"
        closeOnOverlay={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-ui-text-secondary">
            Vas a eliminar esta foto del piso de forma permanente.
          </p>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              Foto #{pisoPhotoToDelete?.id ?? "—"}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeDeletePisoPhotoModal}
              disabled={Boolean(deletingPisoPhotoId)}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleConfirmDeletePisoPhoto}
              disabled={Boolean(deletingPisoPhotoId)}
            >
              {deletingPisoPhotoId ? "Eliminando..." : "Sí, eliminar"}
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

      <Modal
        open={isConvivientePhotoModalOpen}
        title="Foto de perfil"
        onClose={closeConvivientePhotoModal}
        size="default"
        closeLabel="Cerrar"
      >
        {selectedConvivientePhoto.url ? (
          <div className="space-y-4">
            <img
              src={selectedConvivientePhoto.url}
              alt={selectedConvivientePhoto.alt || "Foto de perfil"}
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}