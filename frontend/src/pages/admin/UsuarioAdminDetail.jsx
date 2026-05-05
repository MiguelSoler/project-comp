import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { getApiErrorMessage } from "../../services/apiClient.js";
import {
  deleteAdminUsuarioFoto,
  getAdminUsuarioById,
  resetAdminUsuarioPassword,
  updateAdminUsuario,
  updateAdminUsuarioFoto,
} from "../../services/adminUsuarioService.js";
import {
  joinHabitacion,
  kickFromHabitacion,
  listConvivientesByPiso,
} from "../../services/usuarioHabitacionService.js";
import {
  getUserVotesSummary,
  listReceivedVotes,
} from "../../services/votoUsuarioService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const VOTES_PAGE_LIMIT = 6;

const EMPTY_USER_FORM = {
  nombre: "",
  apellidos: "",
  email: "",
  telefono: "",
  rol: "user",
  activo: "true",
};

const EMPTY_ASSIGN_FORM = {
  habitacion_id: "",
};

const EMPTY_PASSWORD_FORM = {
  password: "",
  confirm_password: "",
};

function ProfileIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function StayIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

function ReputationIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </svg>
  );
}

function ChevronIcon({ open = false }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`h-5 w-5 transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function MobileSectionTab({
  icon,
  label,
  badge,
  isActive,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`flex min-w-[132px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-center transition-all ${
        isActive
          ? "border-brand-primary bg-blue-50 text-brand-primary shadow-sm"
          : "border-slate-200 bg-white text-ui-text hover:border-brand-primary hover:bg-blue-50/60"
      }`}
      onClick={onClick}
      aria-pressed={isActive}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
          {icon}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            isActive
              ? "bg-blue-100 text-brand-primary"
              : "bg-slate-100 text-ui-text-secondary"
          }`}
        >
          {badge}
        </span>
      </div>

      <span className="text-xs font-semibold leading-tight">{label}</span>
    </button>
  );
}

function CompactMetricCard({ title, value, tone = "default" }) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : tone === "info"
          ? "border-sky-200 bg-sky-50"
          : tone === "violet"
            ? "border-violet-200 bg-violet-50"
            : "border-slate-200 bg-slate-50";

  return (
    <div className={`rounded-xl border px-2 py-2.5 sm:px-3 sm:py-3 ${toneClasses}`}>
      <p className="text-[10px] font-medium uppercase leading-tight tracking-wide text-ui-text-secondary sm:text-[11px]">
        {title}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-ui-text sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function buildImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function buildUserFormFromUsuario(usuario) {
  if (!usuario) return EMPTY_USER_FORM;

  return {
    nombre: usuario.nombre || "",
    apellidos: usuario.apellidos || "",
    email: usuario.email || "",
    telefono: usuario.telefono || "",
    rol: usuario.rol || "user",
    activo: usuario.activo ? "true" : "false",
  };
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
  const source = formatDisplayName(usuario);

  return source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
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

function getSummaryMetrics(summaryData) {
  const resumen = summaryData?.resumen || summaryData || null;
  const medias = resumen?.medias || {};

  return {
    limpieza: medias.limpieza ?? null,
    ruido: medias.ruido ?? null,
    pagos: medias.puntualidad_pagos ?? null,
    total: resumen?.total_votos ?? 0,
  };
}

function getVoteItems(data) {
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.votos)) return data.votos;
  if (Array.isArray(data?.votes)) return data.votes;
  if (Array.isArray(data)) return data;
  return [];
}

function getCohabitantItems(data) {
  if (Array.isArray(data?.convivientes)) return data.convivientes;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data)) return data;
  return [];
}

function getAssignErrorMessage(err) {
  switch (err?.error) {
    case "VALIDATION_ERROR":
      return "Introduce un ID de habitación válido.";
    case "HABITACION_NOT_FOUND":
      return "No se encontró la habitación indicada.";
    case "ROOM_ALREADY_OCCUPIED":
      return "La habitación indicada ya está ocupada.";
    case "USER_ALREADY_HAS_ACTIVE_STAY":
      return "Este usuario ya tiene una estancia activa. Primero debes expulsarlo de su habitación actual.";
    case "HABITACION_INACTIVE":
      return "La habitación indicada está inactiva.";
    case "PISO_INACTIVE":
      return "El piso asociado a esa habitación está inactivo.";
    case "USER_INACTIVE":
      return "El usuario está inactivo y no puede asignarse a una habitación.";
    case "ROLE_NOT_ALLOWED_FOR_STAY":
      return "Solo los usuarios con rol Inquilino pueden tener estancia activa.";
    case "CONFLICT_ACTIVE_STAY_OR_OCCUPANCY":
      return "No se pudo completar la asignación porque existe un conflicto de ocupación o estancia activa.";
    default:
      return err?.message || "No se pudo asignar el usuario a la habitación.";
  }
}

function getKickErrorMessage(err) {
  switch (err?.error) {
    case "VALIDATION_ERROR":
      return "No se encontró una estancia válida para expulsar.";
    case "STAY_NOT_FOUND":
      return "No se encontró la estancia activa del usuario.";
    case "STAY_ALREADY_CLOSED":
      return "La estancia ya estaba cerrada.";
    case "FORBIDDEN":
      return "No tienes permisos para expulsar a este usuario.";
    default:
      return err?.message || "No se pudo expulsar al usuario de la habitación.";
  }
}

function Avatar({
  entity,
  sizeClassName = "h-12 w-12",
  textClassName = "text-sm",
  onOpen,
}) {
  const imageUrl = buildImageUrl(entity?.foto_perfil_url);

  if (imageUrl) {
    return (
      <button
        type="button"
        className={`overflow-hidden rounded-full ${sizeClassName}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpen(imageUrl, formatDisplayName(entity));
        }}
        aria-label={`Abrir foto de ${formatDisplayName(entity)}`}
      >
        <img
          src={imageUrl}
          alt={formatDisplayName(entity)}
          className={`${sizeClassName} object-cover`}
        />
      </button>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-blue-100 font-semibold text-brand-primary ${sizeClassName} ${textClassName}`}
    >
      {getInitials(entity)}
    </div>
  );
}

export default function UsuarioAdminDetail() {
  const { usuarioId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("perfil");

  const [usuario, setUsuario] = useState(null);
  const [stay, setStay] = useState(null);

  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN_FORM);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);

  const [votesSummary, setVotesSummary] = useState(null);
  const [receivedVotes, setReceivedVotes] = useState([]);
  const [votesPage, setVotesPage] = useState(1);
  const [votesTotal, setVotesTotal] = useState(0);
  const [votesTotalPages, setVotesTotalPages] = useState(1);

  const [cohabitants, setCohabitants] = useState([]);
  const [openVoteId, setOpenVoteId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingVotes, setLoadingVotes] = useState(true);
  const [loadingCohabitants, setLoadingCohabitants] = useState(false);

  const [savingUser, setSavingUser] = useState(false);
  const [savingStayAction, setSavingStayAction] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);

  const [editFeedback, setEditFeedback] = useState(null);
  const [assignFeedback, setAssignFeedback] = useState(null);
  const [kickFeedback, setKickFeedback] = useState(null);
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [photoFeedback, setPhotoFeedback] = useState(null);

  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [votesError, setVotesError] = useState("");
  const [cohabitantsError, setCohabitantsError] = useState("");

  const [isKickModalOpen, setIsKickModalOpen] = useState(false);
  const [isDeletePhotoModalOpen, setIsDeletePhotoModalOpen] = useState(false);
  const [photoModal, setPhotoModal] = useState(null);

  const summaryMetrics = useMemo(
    () => getSummaryMetrics(votesSummary),
    [votesSummary]
  );

  const currentCohabitantIds = useMemo(
    () => new Set(cohabitants.map((item) => Number(item.id))),
    [cohabitants]
  );

  const sortedReceivedVotes = useMemo(() => {
    return [...receivedVotes].sort((a, b) => {
      const aIsCurrent = currentCohabitantIds.has(Number(a?.votante?.id));
      const bIsCurrent = currentCohabitantIds.has(Number(b?.votante?.id));

      if (aIsCurrent === bIsCurrent) return 0;
      return aIsCurrent ? -1 : 1;
    });
  }, [receivedVotes, currentCohabitantIds]);

  const hasPrevVotes = votesPage > 1;
  const hasNextVotes = votesPage < votesTotalPages;

  async function reloadUsuarioDetail() {
    const data = await getAdminUsuarioById(usuarioId);
    const nextUsuario = data?.user || null;
    const nextStay = data?.stay || null;

    setUsuario(nextUsuario);
    setStay(nextStay);
    setUserForm(buildUserFormFromUsuario(nextUsuario));
  }

  function openPhotoModal(url, label) {
    setPhotoModal({ url, label });
  }

  function closePhotoModal() {
    setPhotoModal(null);
  }

  function openDeletePhotoModal() {
    setPhotoFeedback(null);
    setIsDeletePhotoModalOpen(true);
  }

  function closeDeletePhotoModal() {
    if (deletingPhoto) return;
    setIsDeletePhotoModalOpen(false);
  }

  useEffect(() => {
    setVotesPage(1);
  }, [usuarioId]);

  useEffect(() => {
    setOpenVoteId(null);
  }, [votesPage, usuarioId]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const data = await getAdminUsuarioById(usuarioId);
        if (!isMounted) return;

        const nextUsuario = data?.user || null;
        const nextStay = data?.stay || null;

        setUsuario(nextUsuario);
        setStay(nextStay);
        setUserForm(buildUserFormFromUsuario(nextUsuario));
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudo cargar el detalle del usuario.");
        setUsuario(null);
        setStay(null);
        setUserForm(EMPTY_USER_FORM);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [usuarioId]);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        setLoadingSummary(true);
        setSummaryError("");

        const data = await getUserVotesSummary(usuarioId);
        if (!isMounted) return;

        setVotesSummary(data || null);
      } catch (err) {
        if (!isMounted) return;
        setSummaryError(err?.message || "No se pudo cargar el resumen de reputación.");
        setVotesSummary(null);
      } finally {
        if (isMounted) setLoadingSummary(false);
      }
    }

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, [usuarioId]);

  useEffect(() => {
    let isMounted = true;

    async function loadVotes() {
      try {
        setLoadingVotes(true);
        setVotesError("");

        const data = await listReceivedVotes(usuarioId, {
          page: votesPage,
          limit: VOTES_PAGE_LIMIT,
        });

        if (!isMounted) return;

        setReceivedVotes(getVoteItems(data));
        setVotesTotal(Number(data?.total || 0));
        setVotesTotalPages(Number(data?.totalPages || 1));
      } catch (err) {
        if (!isMounted) return;
        setVotesError(err?.message || "No se pudo cargar el histórico de votos.");
        setReceivedVotes([]);
        setVotesTotal(0);
        setVotesTotalPages(1);
      } finally {
        if (isMounted) setLoadingVotes(false);
      }
    }

    loadVotes();

    return () => {
      isMounted = false;
    };
  }, [usuarioId, votesPage]);

  useEffect(() => {
    let isMounted = true;

    async function loadCohabitants() {
      if (!stay?.piso_id) {
        setCohabitants([]);
        setCohabitantsError("");
        return;
      }

      try {
        setLoadingCohabitants(true);
        setCohabitantsError("");

        const data = await listConvivientesByPiso(stay.piso_id);
        if (!isMounted) return;

        const nextItems = getCohabitantItems(data).filter(
          (item) => Number(item?.id) !== Number(usuarioId)
        );

        setCohabitants(nextItems);
      } catch (err) {
        if (!isMounted) return;
        setCohabitants([]);
        setCohabitantsError(err?.message || "No se pudieron cargar los convivientes.");
      } finally {
        if (isMounted) setLoadingCohabitants(false);
      }
    }

    loadCohabitants();

    return () => {
      isMounted = false;
    };
  }, [stay?.piso_id, usuarioId]);

  function handleSelectTab(nextTab) {
    setActiveTab(nextTab);
    setEditFeedback(null);
    setAssignFeedback(null);
    setKickFeedback(null);
    setPasswordFeedback(null);
    setPhotoFeedback(null);
  }

  function handleUserFormChange(event) {
    const { name, value } = event.target;
    setUserForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAssignFormChange(event) {
    const { name, value } = event.target;
    setAssignForm((prev) => ({
      ...prev,
      [name]: value,
    }));
    setAssignFeedback(null);
  }

  function handlePasswordFormChange(event) {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0] || null;
    setSelectedPhotoFile(file);
    setPhotoFeedback(null);
  }

  function resetUserForm() {
    setUserForm(buildUserFormFromUsuario(usuario));
    setEditFeedback(null);
  }

  function resetPasswordForm() {
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordFeedback(null);
  }

  async function handleSubmitUser(event) {
    event.preventDefault();

    try {
      setSavingUser(true);
      setEditFeedback(null);

      const payload = {
        nombre: userForm.nombre.trim(),
        apellidos: userForm.apellidos.trim(),
        email: userForm.email.trim(),
        telefono: userForm.telefono.trim() || null,
        rol: userForm.rol,
        activo: userForm.activo === "true",
      };

      const data = await updateAdminUsuario(usuarioId, payload);
      const updatedUsuario = data?.user || null;

      if (updatedUsuario) {
        setUsuario(updatedUsuario);
        setUserForm(buildUserFormFromUsuario(updatedUsuario));
      } else {
        await reloadUsuarioDetail();
      }

      setEditFeedback({
        type: "success",
        message: "Usuario actualizado correctamente.",
      });
    } catch (err) {
      setEditFeedback({
        type: "error",
        message: getApiErrorMessage(err, "No se pudo actualizar el usuario."),
      });
    } finally {
      setSavingUser(false);
    }
  }

  async function handleUploadPhoto() {
    if (!selectedPhotoFile) {
      setPhotoFeedback({
        type: "error",
        message: "Selecciona una imagen antes de subirla.",
      });
      return;
    }

    try {
      setUploadingPhoto(true);
      setPhotoFeedback(null);

      const formData = new FormData();
      formData.append("foto", selectedPhotoFile);

      const data = await updateAdminUsuarioFoto(usuarioId, formData);
      const updatedUsuario = data?.user || null;

      if (updatedUsuario) {
        setUsuario(updatedUsuario);
      } else {
        await reloadUsuarioDetail();
      }

      setSelectedPhotoFile(null);
      setPhotoFeedback({
        type: "success",
        message: "Foto de perfil actualizada correctamente.",
      });
    } catch (err) {
      setPhotoFeedback({
        type: "error",
        message: getApiErrorMessage(err, "No se pudo actualizar la foto."),
      });
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleConfirmDeletePhoto() {
    try {
      setDeletingPhoto(true);
      setPhotoFeedback(null);

      await deleteAdminUsuarioFoto(usuarioId);

      setUsuario((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          foto_perfil_url: null,
        };
      });

      setSelectedPhotoFile(null);
      setIsDeletePhotoModalOpen(false);
      setPhotoFeedback({
        type: "success",
        message: "Foto de perfil eliminada correctamente.",
      });
    } catch (err) {
      setPhotoFeedback({
        type: "error",
        message: getApiErrorMessage(err, "No se pudo eliminar la foto."),
      });
    } finally {
      setDeletingPhoto(false);
    }
  }

  async function handleAssignRoom(event) {
    event.preventDefault();

    if (stay) {
      setAssignFeedback({
        type: "error",
        message: "Este usuario ya tiene una estancia activa. Primero debes expulsarlo de su habitación actual.",
      });
      return;
    }

    const habitacionId = Number(assignForm.habitacion_id);
    if (!Number.isInteger(habitacionId) || habitacionId <= 0) {
      setAssignFeedback({
        type: "error",
        message: "Introduce un ID de habitación válido.",
      });
      return;
    }

    try {
      setSavingStayAction(true);
      setAssignFeedback(null);
      setKickFeedback(null);

      await joinHabitacion({
        usuarioId: Number(usuarioId),
        habitacionId,
      });

      await reloadUsuarioDetail();

      setAssignForm(EMPTY_ASSIGN_FORM);
      setAssignFeedback({
        type: "success",
        message: "Usuario asignado correctamente a la habitación.",
      });
    } catch (err) {
      setAssignFeedback({
        type: "error",
        message: getAssignErrorMessage(err),
      });
    } finally {
      setSavingStayAction(false);
    }
  }

  function openKickModal() {
    setKickFeedback(null);
    setAssignFeedback(null);
    setIsKickModalOpen(true);
  }

  function closeKickModal() {
    if (savingStayAction) return;
    setIsKickModalOpen(false);
  }

  async function handleConfirmKick() {
    if (!stay?.id) {
      setKickFeedback({
        type: "error",
        message: "No se encontró la estancia activa del usuario.",
      });
      return;
    }

    try {
      setSavingStayAction(true);
      setKickFeedback(null);
      setAssignFeedback(null);

      await kickFromHabitacion(stay.id);

      await reloadUsuarioDetail();

      setIsKickModalOpen(false);
      setKickFeedback({
        type: "success",
        message: "Usuario expulsado correctamente de la habitación.",
      });
    } catch (err) {
      setKickFeedback({
        type: "error",
        message: getKickErrorMessage(err),
      });
    } finally {
      setSavingStayAction(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();

    if (!passwordForm.password.trim() || !passwordForm.confirm_password.trim()) {
      setPasswordFeedback({
        type: "error",
        message: "Debes completar los dos campos de contraseña.",
      });
      return;
    }

    if (passwordForm.password !== passwordForm.confirm_password) {
      setPasswordFeedback({
        type: "error",
        message: "Las contraseñas no coinciden.",
      });
      return;
    }

    try {
      setResettingPassword(true);
      setPasswordFeedback(null);

      await resetAdminUsuarioPassword(usuarioId, {
        password: passwordForm.password,
      });

      setPasswordForm(EMPTY_PASSWORD_FORM);
      setPasswordFeedback({
        type: "success",
        message: "Contraseña restablecida correctamente.",
      });
    } catch (err) {
      setPasswordFeedback({
        type: "error",
        message: getApiErrorMessage(err, "No se pudo restablecer la contraseña."),
      });
    } finally {
      setResettingPassword(false);
    }
  }

  function renderPerfilSection() {
    return (
      <section className="space-y-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <CompactMetricCard
            title="Rol"
            value={formatRoleLabel(usuario.rol)}
            tone="warning"
          />
          <CompactMetricCard
            title="Estado"
            value={usuario.activo ? "Activo" : "Inactivo"}
            tone="success"
          />
          <CompactMetricCard
            title="Registro"
            value={formatDate(usuario.fecha_registro)}
            tone="info"
          />
        </div>

        <div>
          <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
            Editar usuario
          </h3>
          <p className="mt-1 text-sm text-ui-text-secondary">
            Actualiza los datos principales del usuario.
          </p>
        </div>

        {editFeedback ? (
          <div className={editFeedback.type === "success" ? "alert-success" : "alert-error"}>
            {editFeedback.message}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmitUser}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="usuario-nombre">
                Nombre
              </label>
              <input
                id="usuario-nombre"
                name="nombre"
                type="text"
                className="input"
                value={userForm.nombre}
                onChange={handleUserFormChange}
                disabled={savingUser}
              />
            </div>

            <div>
              <label className="label" htmlFor="usuario-apellidos">
                Apellidos
              </label>
              <input
                id="usuario-apellidos"
                name="apellidos"
                type="text"
                className="input"
                value={userForm.apellidos}
                onChange={handleUserFormChange}
                disabled={savingUser}
              />
            </div>

            <div>
              <label className="label" htmlFor="usuario-email">
                Email
              </label>
              <input
                id="usuario-email"
                name="email"
                type="email"
                className="input"
                value={userForm.email}
                onChange={handleUserFormChange}
                disabled={savingUser}
              />
            </div>

            <div>
              <label className="label" htmlFor="usuario-telefono">
                Teléfono
              </label>
              <input
                id="usuario-telefono"
                name="telefono"
                type="text"
                className="input"
                value={userForm.telefono}
                onChange={handleUserFormChange}
                disabled={savingUser}
              />
            </div>

            <div>
              <label className="label" htmlFor="usuario-rol">
                Rol
              </label>
              <select
                id="usuario-rol"
                name="rol"
                className="select"
                value={userForm.rol}
                onChange={handleUserFormChange}
                disabled={savingUser}
              >
                <option value="user">Inquilino</option>
                <option value="advertiser">Anunciante</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="usuario-activo">
                Estado
              </label>
              <select
                id="usuario-activo"
                name="activo"
                className="select"
                value={userForm.activo}
                onChange={handleUserFormChange}
                disabled={savingUser}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              className="btn border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200"
              onClick={resetUserForm}
              disabled={savingUser}
            >
              Restablecer
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={savingUser}
              aria-busy={savingUser}
            >
              {savingUser ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>

        <div className="card">
          <div className="card-body space-y-4">
            <div>
              <h4 className="text-base font-semibold text-ui-text">
                Foto de perfil
              </h4>
              <p className="mt-1 text-sm text-ui-text-secondary">
                Cambia o elimina la foto de perfil del usuario.
              </p>
            </div>

            {photoFeedback ? (
              <div className={photoFeedback.type === "success" ? "alert-success" : "alert-error"}>
                {photoFeedback.message}
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar
                    entity={usuario}
                    sizeClassName="h-16 w-16"
                    textClassName="text-lg"
                    onOpen={openPhotoModal}
                  />

                  <div className="text-sm text-ui-text-secondary">
                    {selectedPhotoFile
                      ? `Nueva foto seleccionada: ${selectedPhotoFile.name}`
                      : usuario.foto_perfil_url
                        ? "Haz clic en la foto para verla ampliada."
                        : "Este usuario todavía no tiene foto de perfil."}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="usuario-foto"
                    className="btn btn-secondary btn-sm cursor-pointer"
                  >
                    Seleccionar foto
                  </label>

                  {selectedPhotoFile ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleUploadPhoto}
                        disabled={uploadingPhoto || deletingPhoto}
                      >
                        {uploadingPhoto ? "Subiendo..." : "Subir foto"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedPhotoFile(null)}
                        disabled={uploadingPhoto || deletingPhoto}
                      >
                        Quitar selección
                      </button>
                    </>
                  ) : null}

                  {usuario.foto_perfil_url ? (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={openDeletePhotoModal}
                      disabled={uploadingPhoto || deletingPhoto}
                    >
                      Eliminar foto
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <input
              id="usuario-foto"
              name="foto"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
              disabled={uploadingPhoto || deletingPhoto}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-4">
            <div>
              <h4 className="text-base font-semibold text-ui-text">
                Restablecer contraseña
              </h4>
              <p className="mt-1 text-sm text-ui-text-secondary">
                Define una nueva contraseña para este usuario.
              </p>
            </div>

            {passwordFeedback ? (
              <div className={passwordFeedback.type === "success" ? "alert-success" : "alert-error"}>
                {passwordFeedback.message}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="label" htmlFor="new-password">
                    Nueva contraseña
                  </label>
                  <input
                    id="new-password"
                    name="password"
                    type="password"
                    className="input"
                    value={passwordForm.password}
                    onChange={handlePasswordFormChange}
                    disabled={resettingPassword}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="confirm-password">
                    Confirmar contraseña
                  </label>
                  <input
                    id="confirm-password"
                    name="confirm_password"
                    type="password"
                    className="input"
                    value={passwordForm.confirm_password}
                    onChange={handlePasswordFormChange}
                    disabled={resettingPassword}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={resetPasswordForm}
                  disabled={resettingPassword}
                >
                  Limpiar
                </button>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={resettingPassword}
                  aria-busy={resettingPassword}
                >
                  {resettingPassword ? "Restableciendo..." : "Restablecer contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    );
  }

  function renderEstanciaSection() {
    return (
      <section className="space-y-6">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
            Gestión de estancia
          </h3>
          <p className="mt-1 text-sm text-ui-text-secondary">
            Asigna o expulsa al usuario de su habitación actual.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <CompactMetricCard
            title="Habitación"
            value={stay ? stay.habitacion_titulo || "Sin título" : "Sin asignar"}
            tone="violet"
          />
          <CompactMetricCard
            title="Piso"
            value={stay?.piso_id ? `#${stay.piso_id}` : "Sin piso"}
            tone="info"
          />
          <CompactMetricCard
            title="Entrada"
            value={formatDate(stay?.fecha_entrada)}
            tone="success"
          />
        </div>

        <div className="card">
          <div className="card-body space-y-4">
            <div>
              <h4 className="text-base font-semibold text-ui-text">
                Estancia actual
              </h4>
            </div>

            {stay ? (
              <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                      Habitación
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ui-text">
                      {stay.habitacion_titulo || "Sin título"} · #{stay.habitacion_id ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                      Piso
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ui-text">
                      {stay.direccion || "Sin dirección"} · #{stay.piso_id ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                      Ciudad
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ui-text">
                      {stay.ciudad || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                      Fecha de entrada
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ui-text">
                      {formatDateTime(stay.fecha_entrada)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-300 bg-slate-50">
                <div className="card-body">
                  <p className="text-sm text-ui-text-secondary">
                    Este usuario no tiene ninguna estancia activa en este momento.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="card">
            <div className="card-body space-y-4">
              <div>
                <h4 className="text-base font-semibold text-ui-text">
                  Asignar habitación
                </h4>
                <p className="mt-1 text-sm text-ui-text-secondary">
                  Si el usuario ya tiene estancia activa, primero debes expulsarlo de la habitación actual.
                </p>
              </div>

              {assignFeedback ? (
                <div className={assignFeedback.type === "success" ? "alert-success" : "alert-error"}>
                  {assignFeedback.message}
                </div>
              ) : null}

              {stay ? (
                <div className="alert-info">
                  Este usuario ya tiene una estancia activa. Para moverlo a otra habitación, primero debes expulsarlo.
                </div>
              ) : null}

              <form className="space-y-4" onSubmit={handleAssignRoom}>
                <div>
                  <label className="label" htmlFor="assign-habitacion-id">
                    ID de habitación
                  </label>
                  <input
                    id="assign-habitacion-id"
                    name="habitacion_id"
                    type="number"
                    min="1"
                    className="input"
                    value={assignForm.habitacion_id}
                    onChange={handleAssignFormChange}
                    disabled={savingStayAction || Boolean(stay)}
                    placeholder="Ej. 12"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={savingStayAction || Boolean(stay)}
                    aria-busy={savingStayAction}
                  >
                    {savingStayAction ? "Guardando..." : "Asignar habitación"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-body space-y-4">
              <div>
                <h4 className="text-base font-semibold text-ui-text">
                  Expulsar de la habitación
                </h4>
                <p className="mt-1 text-sm text-ui-text-secondary">
                  Finaliza la estancia activa del usuario.
                </p>
              </div>

              {kickFeedback ? (
                <div className={kickFeedback.type === "success" ? "alert-success" : "alert-error"}>
                  {kickFeedback.message}
                </div>
              ) : null}

              {stay?.id ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm text-red-800">
                    Habitación actual:{" "}
                    <span className="font-semibold">
                      {stay.habitacion_titulo || "Sin título"} · #{stay.habitacion_id ?? "—"}
                    </span>
                  </p>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={openKickModal}
                      disabled={savingStayAction}
                    >
                      Expulsar usuario
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-300 bg-slate-50">
                  <div className="card-body">
                    <p className="text-sm text-ui-text-secondary">
                      No hay ninguna estancia activa que expulsar.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-ui-text">
                  Convivientes actuales
                </h4>
                <p className="mt-1 text-sm text-ui-text-secondary">
                  Usuarios que comparten piso con este usuario.
                </p>
              </div>

              {stay?.piso_id ? (
                <span className="text-xs text-ui-text-secondary">
                  Piso #{stay.piso_id}
                </span>
              ) : null}
            </div>

            {cohabitantsError ? (
              <div className="alert-error">{cohabitantsError}</div>
            ) : null}

            {!stay?.piso_id ? (
              <div className="rounded-xl border border-slate-300 bg-slate-50">
                <div className="card-body">
                  <p className="text-sm text-ui-text-secondary">
                    No hay convivientes que mostrar porque el usuario no tiene estancia activa.
                  </p>
                </div>
              </div>
            ) : loadingCohabitants ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-300 bg-slate-50 p-4"
                  >
                    <div className="skeleton h-5 w-2/3" />
                    <div className="mt-2 skeleton h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : cohabitants.length === 0 ? (
              <div className="rounded-xl border border-slate-300 bg-slate-50">
                <div className="card-body">
                  <p className="text-sm text-ui-text-secondary">
                    No hay otros convivientes activos en este piso.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {cohabitants.map((item) => (
                  <article
                    key={item.usuario_habitacion_id}
                    role="button"
                    tabIndex={0}
                    className="rounded-xl border border-slate-300 bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-primary hover:bg-blue-50/60 hover:shadow-md"
                    onClick={() => navigate(`/admin/usuario/${item.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/admin/usuario/${item.id}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        entity={item}
                        sizeClassName="h-12 w-12"
                        textClassName="text-sm"
                        onOpen={openPhotoModal}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ui-text">
                          {formatDisplayName(item)}
                        </p>
                        <p className="mt-1 text-sm text-ui-text-secondary">
                          Habitación #{item.habitacion_id}
                        </p>
                        <p className="mt-1 text-xs text-ui-text-secondary">
                          Entrada: {formatDate(item.fecha_entrada)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  function renderVoteDesktopCard(vote, isCurrentCohabitant) {
    return (
      <article
        key={vote.id}
        role="button"
        tabIndex={0}
        className="card card-hover cursor-pointer"
        onClick={() => {
          if (vote?.votante?.id) {
            navigate(`/admin/usuario/${vote.votante.id}`);
          }
        }}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && vote?.votante?.id) {
            event.preventDefault();
            navigate(`/admin/usuario/${vote.votante.id}`);
          }
        }}
      >
        <div className="card-body space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                entity={vote.votante}
                sizeClassName="h-12 w-12"
                textClassName="text-sm"
                onOpen={openPhotoModal}
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ui-text">
                  {vote.votante
                    ? formatDisplayName(vote.votante)
                    : `Voto #${vote.id}`}
                </p>
                <p className="mt-1 text-xs text-ui-text-secondary">
                  Emitido: {formatDate(vote.created_at)}
                </p>
                <p className="mt-1 text-xs text-ui-text-secondary">
                  Actualizado: {formatDate(vote.updated_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {isCurrentCohabitant ? (
                <span className="badge badge-success">Conviviente actual</span>
              ) : (
                <span className="badge badge-neutral">Histórico</span>
              )}
            </div>
          </div>

          <p className="text-xs text-ui-text-secondary">
            Piso #{vote.piso?.id ?? vote.piso_id ?? "—"} ·{" "}
            {vote.piso?.direccion || "Sin dirección"}
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                Limpieza
              </p>
              <p className="mt-2 text-lg font-bold text-ui-text">
                {vote.limpieza ?? "—"}
              </p>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                Ruido
              </p>
              <p className="mt-2 text-lg font-bold text-ui-text">
                {vote.ruido ?? "—"}
              </p>
            </div>

            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wide text-sky-700">
                Pagos
              </p>
              <p className="mt-2 text-lg font-bold text-ui-text">
                {vote.puntualidad_pagos ?? "—"}
              </p>
            </div>
          </div>

          <p className="text-xs text-ui-text-secondary">
            Cambios realizados: {vote.num_cambios ?? 0}
          </p>
        </div>
      </article>
    );
  }

  function renderVoteMobileCard(vote, isCurrentCohabitant) {
    const isOpen = openVoteId === vote.id;

    return (
      <article
        key={vote.id}
        className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm"
      >
        <div
          role="button"
          tabIndex={0}
          className="p-4"
          onClick={() => setOpenVoteId((prev) => (prev === vote.id ? null : vote.id))}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpenVoteId((prev) => (prev === vote.id ? null : vote.id));
            }
          }}
          aria-expanded={isOpen}
        >
          <div className="flex items-start gap-3">
            <Avatar
              entity={vote.votante}
              sizeClassName="h-12 w-12"
              textClassName="text-sm"
              onOpen={openPhotoModal}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ui-text">
                    {vote.votante
                      ? formatDisplayName(vote.votante)
                      : `Voto #${vote.id}`}
                  </p>
                  <p className="mt-1 text-xs text-ui-text-secondary">
                    {formatDate(vote.created_at)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {isCurrentCohabitant ? (
                    <span className="badge badge-success">Actual</span>
                  ) : (
                    <span className="badge badge-neutral">Hist.</span>
                  )}
                  <ChevronIcon open={isOpen} />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <CompactMetricCard
                  title="Limp."
                  value={vote.limpieza ?? "—"}
                  tone="success"
                />
                <CompactMetricCard
                  title="Ruido"
                  value={vote.ruido ?? "—"}
                  tone="warning"
                />
                <CompactMetricCard
                  title="Pagos"
                  value={vote.puntualidad_pagos ?? "—"}
                  tone="info"
                />
              </div>
            </div>
          </div>
        </div>

        {isOpen ? (
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
            <div className="space-y-3">
              <p className="text-xs text-ui-text-secondary">
                Piso #{vote.piso?.id ?? vote.piso_id ?? "—"} ·{" "}
                {vote.piso?.direccion || "Sin dirección"}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ui-text-secondary">
                    Emitido
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ui-text">
                    {formatDate(vote.created_at)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ui-text-secondary">
                    Actualizado
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ui-text">
                    {formatDate(vote.updated_at)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-ui-text-secondary">
                  Cambios realizados
                </p>
                <p className="mt-1 text-sm font-semibold text-ui-text">
                  {vote.num_cambios ?? 0}
                </p>
              </div>

              {vote?.votante?.id ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/admin/usuario/${vote.votante.id}`)}
                  >
                    Ver perfil del votante
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  function renderReputacionSection() {
    return (
      <section className="space-y-6">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
            Reputación del usuario
          </h3>
          <p className="mt-1 text-sm text-ui-text-secondary">
            Aquí se muestra el histórico completo de votos recibidos, incluidos compañeros anteriores.
          </p>
        </div>

        <div className="alert-info">
          La reputación es histórica: aunque el usuario ya no conviva con esas personas o actualmente no tenga estancia activa, sus votos recibidos siguen apareciendo aquí.
        </div>

        {summaryError ? <div className="alert-error">{summaryError}</div> : null}
        {votesError ? <div className="alert-error">{votesError}</div> : null}

        {loadingSummary ? (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-300 bg-slate-50 p-3"
              >
                <div className="skeleton h-4 w-1/2" />
                <div className="mt-3 skeleton h-7 w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <CompactMetricCard
              title="Limpieza"
              value={formatMetric(summaryMetrics.limpieza)}
              tone="success"
            />
            <CompactMetricCard
              title="Ruido"
              value={formatMetric(summaryMetrics.ruido)}
              tone="warning"
            />
            <CompactMetricCard
              title="Pagos"
              value={formatMetric(summaryMetrics.pagos)}
              tone="info"
            />
            <CompactMetricCard
              title="Votos"
              value={summaryMetrics.total}
              tone="violet"
            />
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-base font-semibold text-ui-text">
              Histórico de votos recibidos
            </h4>
            <span className="text-xs text-ui-text-secondary">
              Total: {votesTotal}
            </span>
          </div>

          {loadingVotes ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="card">
                  <div className="card-body space-y-3">
                    <div className="skeleton h-5 w-2/3" />
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedReceivedVotes.length === 0 ? (
            <div className="card">
              <div className="card-body">
                <p className="text-sm text-ui-text-secondary">
                  Este usuario todavía no ha recibido votos.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {sortedReceivedVotes.map((vote) => {
                  const isCurrentCohabitant = currentCohabitantIds.has(
                    Number(vote?.votante?.id)
                  );

                  return renderVoteMobileCard(vote, isCurrentCohabitant);
                })}
              </div>

              <div className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
                {sortedReceivedVotes.map((vote) => {
                  const isCurrentCohabitant = currentCohabitantIds.has(
                    Number(vote?.votante?.id)
                  );

                  return renderVoteDesktopCard(vote, isCurrentCohabitant);
                })}
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ui-text-secondary">
                  Página <span className="font-medium text-ui-text">{votesPage}</span> de{" "}
                  <span className="font-medium text-ui-text">{votesTotalPages}</span>
                </p>

                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={!hasPrevVotes || loadingVotes}
                    onClick={() => setVotesPage((prev) => prev - 1)}
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={!hasNextVotes || loadingVotes}
                    onClick={() => setVotesPage((prev) => prev + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  function renderActiveTabContent() {
    if (activeTab === "perfil") return renderPerfilSection();
    if (activeTab === "estancia") return renderEstanciaSection();
    return renderReputacionSection();
  }

  return (
    <>
      <PageShell
        title="Detalle de usuario"
        subtitle="Consulta y gestiona este usuario como administrador."
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
                <div className="flex items-center gap-4">
                  <div className="skeleton h-20 w-20 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-6 w-1/3" />
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton h-4 w-1/4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-300 bg-white p-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <div className="skeleton h-11 w-full rounded-xl" />
                <div className="skeleton h-11 w-full rounded-xl" />
                <div className="skeleton h-11 w-full rounded-xl" />
              </div>
            </div>
          </div>
        ) : usuario ? (
          <>
            <div className="card">
              <div className="card-body space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar
                      entity={usuario}
                      sizeClassName="h-20 w-20"
                      textClassName="text-xl"
                      onOpen={openPhotoModal}
                    />

                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-ui-text">
                        {formatDisplayName(usuario)}
                      </h2>

                      <p className="text-sm text-ui-text-secondary">
                        {usuario.email || "Sin email"}
                      </p>

                      <p className="text-sm text-ui-text-secondary">
                        {usuario.telefono || "Sin teléfono"}
                      </p>
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
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:hidden">
              <div className="sticky top-3 z-20 -mx-3 overflow-x-auto px-3">
                <div className="flex min-w-max gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
                  <MobileSectionTab
                    icon={<ProfileIcon />}
                    label="Perfil"
                    badge="Editar"
                    isActive={activeTab === "perfil"}
                    onClick={() => handleSelectTab("perfil")}
                  />

                  <MobileSectionTab
                    icon={<StayIcon />}
                    label="Estancia"
                    badge="Gest."
                    isActive={activeTab === "estancia"}
                    onClick={() => handleSelectTab("estancia")}
                  />

                  <MobileSectionTab
                    icon={<ReputationIcon />}
                    label="Reputación"
                    badge="Hist."
                    isActive={activeTab === "reputacion"}
                    onClick={() => handleSelectTab("reputacion")}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-300 bg-white p-4">
                {renderActiveTabContent()}
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="space-y-0">
                <div
                  role="tablist"
                  aria-label="Secciones del detalle del usuario"
                  className="grid grid-cols-3 gap-2"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "perfil"}
                    className={`flex items-center justify-between rounded-t-xl rounded-b-lg border px-4 py-3 text-left transition-all duration-200 ${
                      activeTab === "perfil"
                        ? "relative z-10 -mb-px rounded-t-2xl rounded-b-none border-slate-300 border-b-white bg-white text-brand-primary shadow-sm"
                        : "cursor-pointer rounded-xl border-slate-400 bg-white text-ui-text shadow-sm hover:-translate-y-0.5 hover:border-brand-primary hover:bg-blue-50/60 hover:text-brand-primary hover:shadow-md"
                    }`}
                    onClick={() => handleSelectTab("perfil")}
                  >
                    <span className="font-semibold">Perfil</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        activeTab === "perfil"
                          ? "bg-blue-100 text-brand-primary"
                          : "bg-slate-100 text-ui-text-secondary"
                      }`}
                    >
                      Editar
                    </span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "estancia"}
                    className={`flex items-center justify-between rounded-t-xl rounded-b-lg border px-4 py-3 text-left transition-all duration-200 ${
                      activeTab === "estancia"
                        ? "relative z-10 -mb-px rounded-t-2xl rounded-b-none border-slate-300 border-b-white bg-white text-brand-primary shadow-sm"
                        : "cursor-pointer rounded-xl border-slate-400 bg-white text-ui-text shadow-sm hover:-translate-y-0.5 hover:border-brand-primary hover:bg-blue-50/60 hover:text-brand-primary hover:shadow-md"
                    }`}
                    onClick={() => handleSelectTab("estancia")}
                  >
                    <span className="font-semibold">Estancia</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        activeTab === "estancia"
                          ? "bg-blue-100 text-brand-primary"
                          : "bg-slate-100 text-ui-text-secondary"
                      }`}
                    >
                      Gestión
                    </span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "reputacion"}
                    className={`flex items-center justify-between rounded-t-xl rounded-b-lg border px-4 py-3 text-left transition-all duration-200 ${
                      activeTab === "reputacion"
                        ? "relative z-10 -mb-px rounded-t-2xl rounded-b-none border-slate-300 border-b-white bg-white text-brand-primary shadow-sm"
                        : "cursor-pointer rounded-xl border-slate-400 bg-white text-ui-text shadow-sm hover:-translate-y-0.5 hover:border-brand-primary hover:bg-blue-50/60 hover:text-brand-primary hover:shadow-md"
                    }`}
                    onClick={() => handleSelectTab("reputacion")}
                  >
                    <span className="font-semibold">Reputación</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        activeTab === "reputacion"
                          ? "bg-blue-100 text-brand-primary"
                          : "bg-slate-100 text-ui-text-secondary"
                      }`}
                    >
                      Histórico
                    </span>
                  </button>
                </div>

                <div
                  className={`border border-slate-300 bg-white p-5 ${
                    activeTab === "perfil"
                      ? "rounded-b-2xl rounded-tr-2xl rounded-tl-none"
                      : activeTab === "estancia"
                        ? "rounded-b-2xl rounded-tl-2xl rounded-tr-2xl"
                        : "rounded-b-2xl rounded-tl-2xl rounded-tr-none"
                  }`}
                >
                  {renderActiveTabContent()}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </PageShell>

      <Modal
        open={isKickModalOpen}
        title="Confirmar expulsión"
        onClose={closeKickModal}
        size="md"
        tone="default"
        closeLabel="Cancelar"
        closeOnOverlay={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-ui-text-secondary">
            Vas a expulsar a este usuario de su habitación actual.
          </p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">
              {formatDisplayName(usuario)}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Habitación #{stay?.habitacion_id ?? "—"}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeKickModal}
              disabled={savingStayAction}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn btn-sm border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200"
              onClick={handleConfirmKick}
              disabled={savingStayAction}
            >
              {savingStayAction ? "Expulsando..." : "Sí, expulsar"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isDeletePhotoModalOpen}
        title="Confirmar eliminación"
        onClose={closeDeletePhotoModal}
        size="md"
        tone="default"
        closeLabel="Cancelar"
        closeOnOverlay={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-ui-text-secondary">
            Vas a eliminar la foto de perfil de este usuario.
          </p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">
              {formatDisplayName(usuario)}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeDeletePhotoModal}
              disabled={deletingPhoto}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn btn-sm border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200"
              onClick={handleConfirmDeletePhoto}
              disabled={deletingPhoto}
            >
              {deletingPhoto ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(photoModal)}
        title={photoModal?.label || "Foto de perfil"}
        onClose={closePhotoModal}
        size="default"
        closeLabel="Cerrar"
      >
        {photoModal ? (
          <div className="space-y-4">
            <img
              src={photoModal.url}
              alt={photoModal.label || "Foto de perfil"}
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}