import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/ui/Modal.jsx";
import {
  getMyProfile,
  updateMyProfile,
  updateMyProfileFoto,
  deleteMyProfileFoto,
  deleteMyAccount,
  dejarDeSerAdvertiser,
  updateMyPassword,
} from "../../services/usuarioService.js";
import { getApiErrorMessage } from "../../services/apiClient.js";
import useAuth from "../../hooks/useAuth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const EMPTY_FORM = {
  nombre: "",
  apellidos: "",
  email: "",
  telefono: "",
};

const EMPTY_PASSWORD_FORM = {
  current_password: "",
  new_password: "",
  confirm_new_password: "",
};

function formatRoleLabel(rol) {
  if (rol === "admin") return "Admin";
  if (rol === "advertiser") return "Anunciante";
  if (rol === "user") return "Usuario";
  return "—";
}

function buildImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function getInitials(user) {
  const nombre = user?.nombre || "";
  const apellidos = user?.apellidos || "";
  const email = user?.email || "";
  const source = `${nombre} ${apellidos}`.trim() || email || "U";

  return source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getProfileErrorMessage(err) {
  switch (err?.error) {
    case "VALIDATION_ERROR":
      return "Revisa los datos del formulario.";
    case "DUPLICATE_EMAIL":
      return "Ese email ya está en uso por otro usuario.";
    case "NO_FIELDS_TO_UPDATE":
      return "No hay cambios para guardar.";
    default:
      return err?.message || "No se pudo actualizar el perfil.";
  }
}

function getPhotoErrorMessage(err) {
  switch (err?.error) {
    case "VALIDATION_ERROR":
      return "Debes seleccionar una imagen válida.";
    default:
      return err?.message || "No se pudo actualizar la foto de perfil.";
  }
}

function getPasswordErrorMessage(err) {
  switch (err?.error) {
    case "VALIDATION_ERROR":
      return "Revisa los campos de contraseña. La nueva contraseña debe tener al menos 8 caracteres.";
    case "INVALID_CREDENTIALS":
      return "La contraseña actual no es correcta.";
    case "PASSWORD_SAME_AS_OLD":
      return "La nueva contraseña no puede ser igual a la actual.";
    case "USER_INACTIVE":
      return "Tu usuario está inactivo.";
    case "USER_NOT_FOUND":
      return "No se encontró el usuario.";
    default:
      return err?.message || "No se pudo cambiar la contraseña.";
  }
}

export default function Perfil() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { logout, setUser, setSession } = useAuth();

  const [activeTab, setActiveTab] = useState("perfil");

  const [form, setForm] = useState(EMPTY_FORM);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD_FORM);
  const [meta, setMeta] = useState(null);

  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [photoFeedback, setPhotoFeedback] = useState(null);
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [roleFeedback, setRoleFeedback] = useState(null);
  const [accountFeedback, setAccountFeedback] = useState(null);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isDeletePhotoModalOpen, setIsDeletePhotoModalOpen] = useState(false);
  const [isLeaveAdvertiserModalOpen, setIsLeaveAdvertiserModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

  const avatarUrl = buildImageUrl(meta?.foto_perfil_url);
  const hasCuentaTab = meta?.rol === "user" || meta?.rol === "advertiser";

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);
        setPhotoFeedback(null);
        setPasswordFeedback(null);
        setRoleFeedback(null);
        setAccountFeedback(null);

        const data = await getMyProfile();
        const user = data?.user || null;

        if (!isMounted) return;

        setMeta(user);
        setForm({
          nombre: user?.nombre || "",
          apellidos: user?.apellidos || "",
          email: user?.email || "",
          telefono: user?.telefono || "",
        });
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudo cargar el perfil.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasCuentaTab && activeTab === "cuenta") {
      setActiveTab("perfil");
    }
  }, [hasCuentaTab, activeTab]);

  function handleSelectTab(nextTab) {
    setActiveTab(nextTab);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    setPasswordFeedback(null);
  }

  function resetPasswordForm() {
    setPasswordForm(EMPTY_PASSWORD_FORM);
    setPasswordFeedback(null);
  }

  function handlePhotoSelection(event) {
    const file = event.target.files?.[0] || null;
    setSelectedPhotoFile(file);
    setPhotoFeedback(null);
  }

  function resetPhotoSelection() {
    setSelectedPhotoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      setPhotoFeedback(null);
      setPasswordFeedback(null);
      setRoleFeedback(null);
      setAccountFeedback(null);

      const payload = {
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
      };

      const data = await updateMyProfile(payload);
      const updatedUser = data?.user || null;

      setMeta(updatedUser);
      setForm({
        nombre: updatedUser?.nombre || "",
        apellidos: updatedUser?.apellidos || "",
        email: updatedUser?.email || "",
        telefono: updatedUser?.telefono || "",
      });

      if (updatedUser) {
        setUser(updatedUser);
      }

      setSuccess("Perfil actualizado correctamente.");
    } catch (err) {
      setError(getProfileErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitPassword(event) {
    event.preventDefault();

    const currentPassword = passwordForm.current_password.trim();
    const newPassword = passwordForm.new_password.trim();
    const confirmNewPassword = passwordForm.confirm_new_password.trim();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordFeedback({
        type: "error",
        message: "Debes completar los tres campos de contraseña.",
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFeedback({
        type: "error",
        message: "La nueva contraseña debe tener al menos 8 caracteres.",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordFeedback({
        type: "error",
        message: "La nueva contraseña y la confirmación no coinciden.",
      });
      return;
    }

    try {
      setChangingPassword(true);
      setError(null);
      setSuccess(null);
      setPhotoFeedback(null);
      setPasswordFeedback(null);
      setRoleFeedback(null);
      setAccountFeedback(null);

      const data = await updateMyPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (data?.token && meta) {
        setSession(data.token, meta);
      }

      resetPasswordForm();

      setPasswordFeedback({
        type: "success",
        message: "Contraseña actualizada correctamente.",
      });
    } catch (err) {
      setPasswordFeedback({
        type: "error",
        message: getPasswordErrorMessage(err),
      });
    } finally {
      setChangingPassword(false);
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
      setError(null);
      setSuccess(null);
      setPhotoFeedback(null);
      setPasswordFeedback(null);
      setRoleFeedback(null);
      setAccountFeedback(null);

      const formData = new FormData();
      formData.append("foto", selectedPhotoFile);

      const data = await updateMyProfileFoto(formData);
      const updatedUser = data?.user || null;

      if (updatedUser) {
        setMeta(updatedUser);
        setUser(updatedUser);
      }

      resetPhotoSelection();

      setPhotoFeedback({
        type: "success",
        message: "Foto de perfil actualizada correctamente.",
      });
    } catch (err) {
      setPhotoFeedback({
        type: "error",
        message: getPhotoErrorMessage(err),
      });
    } finally {
      setUploadingPhoto(false);
    }
  }

  function openDeletePhotoModal() {
    setError(null);
    setSuccess(null);
    setPhotoFeedback(null);
    setPasswordFeedback(null);
    setRoleFeedback(null);
    setAccountFeedback(null);
    setIsDeletePhotoModalOpen(true);
  }

  function closeDeletePhotoModal() {
    if (deletingPhoto) return;
    setIsDeletePhotoModalOpen(false);
  }

  async function handleConfirmDeletePhoto() {
    try {
      setDeletingPhoto(true);
      setError(null);
      setSuccess(null);
      setPhotoFeedback(null);
      setPasswordFeedback(null);
      setRoleFeedback(null);
      setAccountFeedback(null);

      await deleteMyProfileFoto();

      const nextUser = meta
        ? {
            ...meta,
            foto_perfil_url: null,
          }
        : meta;

      setMeta(nextUser);

      if (nextUser) {
        setUser(nextUser);
      }

      setIsDeletePhotoModalOpen(false);
      resetPhotoSelection();

      setPhotoFeedback({
        type: "success",
        message: "Foto de perfil eliminada correctamente.",
      });
    } catch (err) {
      setIsDeletePhotoModalOpen(false);
      setPhotoFeedback({
        type: "error",
        message: err?.message || "No se pudo eliminar la foto de perfil.",
      });
    } finally {
      setDeletingPhoto(false);
    }
  }

  function openPhotoModal() {
    if (!avatarUrl) return;
    setIsPhotoModalOpen(true);
  }

  function closePhotoModal() {
    setIsPhotoModalOpen(false);
  }

  function openLeaveAdvertiserModal() {
    setError(null);
    setSuccess(null);
    setPhotoFeedback(null);
    setPasswordFeedback(null);
    setRoleFeedback(null);
    setAccountFeedback(null);
    setIsLeaveAdvertiserModalOpen(true);
  }

  function closeLeaveAdvertiserModal() {
    if (changingRole) return;
    setIsLeaveAdvertiserModalOpen(false);
  }

  async function handleConfirmLeaveAdvertiser() {
    try {
      setChangingRole(true);
      setError(null);
      setSuccess(null);
      setPhotoFeedback(null);
      setPasswordFeedback(null);
      setRoleFeedback(null);
      setAccountFeedback(null);

      const data = await dejarDeSerAdvertiser();

      if (data?.token && data?.user) {
        setSession(data.token, data.user);
        setMeta(data.user);
        setForm({
          nombre: data.user.nombre || "",
          apellidos: data.user.apellidos || "",
          email: data.user.email || "",
          telefono: data.user.telefono || "",
        });
      } else if (data?.user) {
        setUser(data.user);
        setMeta(data.user);
      }

      setIsLeaveAdvertiserModalOpen(false);
      setRoleFeedback({
        type: "success",
        message: "Has dejado de ser anunciante correctamente.",
      });
    } catch (err) {
      setIsLeaveAdvertiserModalOpen(false);

      if (err?.error === "USER_HAS_ACTIVE_PISOS") {
        setRoleFeedback({
          type: "error",
          message: "No puedes dejar de ser anunciante mientras tengas pisos activos.",
        });
      } else if (err?.error === "ROLE_NOT_ADVERTISER") {
        setRoleFeedback({
          type: "error",
          message: "Tu cuenta ya no tiene rol de anunciante.",
        });
      } else {
        setRoleFeedback({
          type: "error",
          message: err?.message || "No se pudo completar la operación.",
        });
      }
    } finally {
      setChangingRole(false);
    }
  }

  function openDeleteAccountModal() {
    setError(null);
    setSuccess(null);
    setPhotoFeedback(null);
    setPasswordFeedback(null);
    setRoleFeedback(null);
    setAccountFeedback(null);
    setIsDeleteAccountModalOpen(true);
  }

  function closeDeleteAccountModal() {
    if (deletingAccount) return;
    setIsDeleteAccountModalOpen(false);
  }

  async function handleConfirmDeleteAccount() {
    try {
      setDeletingAccount(true);
      setError(null);
      setSuccess(null);
      setPhotoFeedback(null);
      setPasswordFeedback(null);
      setRoleFeedback(null);
      setAccountFeedback(null);

      await deleteMyAccount();

      setIsDeleteAccountModalOpen(false);
      logout();
      navigate("/", { replace: true });
    } catch (err) {
      setIsDeleteAccountModalOpen(false);
      setAccountFeedback({
        type: "error",
        message: getApiErrorMessage(err, "No se pudo eliminar la cuenta."),
      });
    } finally {
      setDeletingAccount(false);
    }
  }

  if (loading) {
    return (
      <section className="section">
        <div className="app-container">
          <div className="card">
            <div className="card-body space-y-4">
              <div className="skeleton h-8 w-48" />
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-32" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="section">
        <div className="app-container">
          <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
            <header className="overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 shadow-sm">
              <div className="flex flex-col gap-4 p-4 sm:p-6 md:flex-row md:items-start md:justify-between md:p-8">
                <div className="space-y-3">
                  <div className="inline-flex rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
                    Zona personal
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-ui-text">
                      Mi perfil
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-ui-text-secondary">
                      Consulta y actualiza tus datos personales.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-stretch sm:justify-end">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm w-full sm:w-auto"
                    onClick={() => navigate(-1)}
                  >
                    Volver
                  </button>
                </div>
              </div>
            </header>

            {error ? <div className="alert-error">{error}</div> : null}
            {success ? <div className="alert-success">{success}</div> : null}

            {photoFeedback ? (
              <div className={photoFeedback.type === "success" ? "alert-success" : "alert-error"}>
                {photoFeedback.message}
              </div>
            ) : null}

            {passwordFeedback ? (
              <div className={passwordFeedback.type === "success" ? "alert-success" : "alert-error"}>
                {passwordFeedback.message}
              </div>
            ) : null}

            {roleFeedback ? (
              <div className={roleFeedback.type === "success" ? "alert-success" : "alert-error"}>
                {roleFeedback.message}
              </div>
            ) : null}

            {accountFeedback ? (
              <div className={accountFeedback.type === "success" ? "alert-success" : "alert-error"}>
                {accountFeedback.message}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 shadow-sm">
              <div className="card-body space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    {avatarUrl ? (
                      <button
                        type="button"
                        className="block"
                        onClick={openPhotoModal}
                        aria-label="Ver foto de perfil"
                      >
                        <img
                          src={avatarUrl}
                          alt={meta?.nombre || "Foto de perfil"}
                          className="h-16 w-16 rounded-full object-cover sm:h-20 sm:w-20"
                        />
                      </button>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-brand-primary sm:h-20 sm:w-20">
                        {getInitials(meta)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-ui-text">
                        {[meta?.nombre, meta?.apellidos].filter(Boolean).join(" ") || "Usuario"}
                      </p>
                      <p className="truncate text-sm text-ui-text-secondary">
                        {meta?.email || "—"}
                      </p>
                      <p className="mt-1 text-xs text-ui-text-secondary">
                        Rol: {formatRoleLabel(meta?.rol)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-0">
              <div
                role="tablist"
                aria-label="Secciones del perfil"
                className={`grid grid-cols-2 gap-2 ${
                  hasCuentaTab ? "lg:grid-cols-4" : "sm:grid-cols-3"
                }`}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "perfil"}
                  className={`flex items-center justify-between border px-4 py-3 text-left transition-all duration-200 ${
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
                    Datos
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "seguridad"}
                  className={`flex items-center justify-between border px-4 py-3 text-left transition-all duration-200 ${
                    activeTab === "seguridad"
                      ? "relative z-10 -mb-px rounded-t-2xl rounded-b-none border-slate-300 border-b-white bg-white text-brand-primary shadow-sm"
                      : "cursor-pointer rounded-xl border-slate-400 bg-white text-ui-text shadow-sm hover:-translate-y-0.5 hover:border-brand-primary hover:bg-blue-50/60 hover:text-brand-primary hover:shadow-md"
                  }`}
                  onClick={() => handleSelectTab("seguridad")}
                >
                  <span className="font-semibold">Seguridad</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      activeTab === "seguridad"
                        ? "bg-blue-100 text-brand-primary"
                        : "bg-slate-100 text-ui-text-secondary"
                    }`}
                  >
                    Contraseña
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "foto"}
                  className={`flex items-center justify-between border px-4 py-3 text-left transition-all duration-200 ${
                    activeTab === "foto"
                      ? "relative z-10 -mb-px rounded-t-2xl rounded-b-none border-slate-300 border-b-white bg-white text-brand-primary shadow-sm"
                      : "cursor-pointer rounded-xl border-slate-400 bg-white text-ui-text shadow-sm hover:-translate-y-0.5 hover:border-brand-primary hover:bg-blue-50/60 hover:text-brand-primary hover:shadow-md"
                  }`}
                  onClick={() => handleSelectTab("foto")}
                >
                  <span className="font-semibold">Foto</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      activeTab === "foto"
                        ? "bg-blue-100 text-brand-primary"
                        : "bg-slate-100 text-ui-text-secondary"
                    }`}
                  >
                    Perfil
                  </span>
                </button>

                {hasCuentaTab ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "cuenta"}
                    className={`flex items-center justify-between border px-4 py-3 text-left transition-all duration-200 ${
                      activeTab === "cuenta"
                        ? "relative z-10 -mb-px rounded-t-2xl rounded-b-none border-slate-300 border-b-white bg-white text-brand-primary shadow-sm"
                        : "cursor-pointer rounded-xl border-slate-400 bg-white text-ui-text shadow-sm hover:-translate-y-0.5 hover:border-brand-primary hover:bg-blue-50/60 hover:text-brand-primary hover:shadow-md"
                    }`}
                    onClick={() => handleSelectTab("cuenta")}
                  >
                    <span className="font-semibold">Cuenta</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        activeTab === "cuenta"
                          ? "bg-blue-100 text-brand-primary"
                          : "bg-slate-100 text-ui-text-secondary"
                      }`}
                    >
                      Rol
                    </span>
                  </button>
                ) : null}
              </div>

              <div
                className={`border border-slate-300 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-3 shadow-sm sm:p-4 md:p-5 ${
                  activeTab === "perfil"
                    ? "rounded-b-2xl rounded-tr-2xl rounded-tl-none"
                    : activeTab === "seguridad"
                      ? hasCuentaTab
                        ? "rounded-b-2xl rounded-tl-2xl rounded-tr-2xl"
                        : "rounded-b-2xl rounded-tl-2xl rounded-tr-2xl"
                      : activeTab === "foto"
                        ? hasCuentaTab
                          ? "rounded-b-2xl rounded-tl-2xl rounded-tr-2xl"
                          : "rounded-b-2xl rounded-tl-2xl rounded-tr-none"
                        : "rounded-b-2xl rounded-tl-2xl rounded-tr-none"
                }`}
              >
                {activeTab === "perfil" ? (
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                        Datos personales
                      </h2>
                      <p className="mt-1 text-sm text-ui-text-secondary">
                        Actualiza tu información básica.
                      </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="label" htmlFor="nombre">
                            Nombre
                          </label>
                          <input
                            id="nombre"
                            name="nombre"
                            type="text"
                            className="input"
                            value={form.nombre}
                            onChange={handleChange}
                            disabled={saving}
                          />
                        </div>

                        <div>
                          <label className="label" htmlFor="apellidos">
                            Apellidos
                          </label>
                          <input
                            id="apellidos"
                            name="apellidos"
                            type="text"
                            className="input"
                            value={form.apellidos}
                            onChange={handleChange}
                            disabled={saving}
                          />
                        </div>

                        <div>
                          <label className="label" htmlFor="email">
                            Email
                          </label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            className="input"
                            value={form.email}
                            onChange={handleChange}
                            disabled={saving}
                          />
                        </div>

                        <div>
                          <label className="label" htmlFor="telefono">
                            Teléfono
                          </label>
                          <input
                            id="telefono"
                            name="telefono"
                            type="text"
                            className="input"
                            value={form.telefono}
                            onChange={handleChange}
                            disabled={saving}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-stretch sm:justify-end">
                        <button
                          type="submit"
                          className="btn btn-primary w-full sm:w-auto"
                          disabled={saving}
                          aria-busy={saving}
                        >
                          {saving ? "Guardando..." : "Guardar cambios"}
                        </button>
                      </div>
                    </form>
                  </section>
                ) : null}

                {activeTab === "seguridad" ? (
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                        Cambiar contraseña
                      </h2>
                      <p className="mt-1 text-sm text-ui-text-secondary">
                        Actualiza tu contraseña para mantener tu cuenta segura.
                      </p>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmitPassword}>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="label" htmlFor="current_password">
                            Contraseña actual
                          </label>
                          <input
                            id="current_password"
                            name="current_password"
                            type="password"
                            className="input"
                            value={passwordForm.current_password}
                            onChange={handlePasswordChange}
                            disabled={changingPassword}
                          />
                        </div>

                        <div>
                          <label className="label" htmlFor="new_password">
                            Nueva contraseña
                          </label>
                          <input
                            id="new_password"
                            name="new_password"
                            type="password"
                            className="input"
                            value={passwordForm.new_password}
                            onChange={handlePasswordChange}
                            disabled={changingPassword}
                          />
                        </div>

                        <div>
                          <label className="label" htmlFor="confirm_new_password">
                            Confirmar nueva contraseña
                          </label>
                          <input
                            id="confirm_new_password"
                            name="confirm_new_password"
                            type="password"
                            className="input"
                            value={passwordForm.confirm_new_password}
                            onChange={handlePasswordChange}
                            disabled={changingPassword}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:justify-end">
                        <button
                          type="button"
                          className="btn btn-secondary w-full sm:w-auto"
                          onClick={resetPasswordForm}
                          disabled={changingPassword}
                        >
                          Limpiar
                        </button>

                        <button
                          type="submit"
                          className="btn btn-primary w-full sm:w-auto"
                          disabled={changingPassword}
                          aria-busy={changingPassword}
                        >
                          {changingPassword ? "Actualizando..." : "Cambiar contraseña"}
                        </button>
                      </div>
                    </form>
                  </section>
                ) : null}

                {activeTab === "foto" ? (
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                        Foto de perfil
                      </h2>
                      <p className="mt-1 text-sm text-ui-text-secondary">
                        Sube una nueva imagen o elimina la foto actual.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-sky-50 p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-ui-text-secondary">
                          {selectedPhotoFile
                            ? `Nueva foto seleccionada: ${selectedPhotoFile.name}`
                            : meta?.foto_perfil_url
                              ? "Ya tienes una foto de perfil."
                              : "Todavía no has subido ninguna foto de perfil."}
                        </div>

                        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                          <input
                            ref={fileInputRef}
                            id="perfil-foto"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoSelection}
                            disabled={uploadingPhoto || deletingPhoto}
                          />

                          <label
                            htmlFor="perfil-foto"
                            className="btn btn-secondary btn-sm w-full cursor-pointer sm:w-auto"
                          >
                            Seleccionar foto
                          </label>

                          {selectedPhotoFile ? (
                            <>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm w-full sm:w-auto"
                                onClick={handleUploadPhoto}
                                disabled={uploadingPhoto || deletingPhoto}
                              >
                                {uploadingPhoto ? "Subiendo..." : "Subir foto"}
                              </button>

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm w-full sm:w-auto"
                                onClick={resetPhotoSelection}
                                disabled={uploadingPhoto || deletingPhoto}
                              >
                                Quitar selección
                              </button>
                            </>
                          ) : null}

                          {meta?.foto_perfil_url ? (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm w-full sm:w-auto"
                              onClick={openDeletePhotoModal}
                              disabled={uploadingPhoto || deletingPhoto}
                            >
                              Eliminar foto
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </section>
                ) : null}

                {activeTab === "cuenta" && hasCuentaTab ? (
                  <section className="space-y-4">
                    <div className="rounded-2xl border border-violet-300 bg-gradient-to-br from-violet-50 via-white to-sky-50">
                      <div className="card-body">
                        <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
                          Rol actual
                        </p>
                        <p className="mt-2 text-2xl font-bold text-ui-text">
                          {formatRoleLabel(meta?.rol)}
                        </p>
                      </div>
                    </div>

                    {meta?.rol === "user" ? (
                      <>
                        <div>
                          <h2 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                            Convertirse en anunciante
                          </h2>
                          <p className="mt-1 text-sm text-ui-text-secondary">
                            Crea tu primer piso y tu cuenta pasará a rol anunciante.
                          </p>
                        </div>

                        <div className="flex justify-stretch sm:justify-end">
                          <button
                            type="button"
                            className="btn btn-primary w-full sm:w-auto"
                            onClick={() => navigate("/convertirse-anunciante")}
                          >
                            Empezar
                          </button>
                        </div>
                      </>
                    ) : null}

                    {meta?.rol === "advertiser" ? (
                      <>
                        <div>
                          <h2 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                            Dejar de ser anunciante
                          </h2>
                          <p className="mt-1 text-sm text-ui-text-secondary">
                            Volverás a rol usuario. Antes debes asegurarte de no tener pisos activos.
                          </p>
                        </div>

                        <div className="flex justify-stretch sm:justify-end">
                          <button
                            type="button"
                            className="btn btn-danger w-full sm:w-auto"
                            onClick={openLeaveAdvertiserModal}
                          >
                            Dejar de ser anunciante
                          </button>
                        </div>
                      </>
                    ) : null}

                    <div className="border-t border-slate-300 pt-4">
                      <div>
                        <h2 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                          Eliminar cuenta
                        </h2>
                        <p className="mt-1 text-sm text-ui-text-secondary">
                          Desactiva tu cuenta y cierra tu sesión en este dispositivo.
                        </p>
                      </div>

                      <div className="mt-4 flex justify-stretch sm:justify-end">
                        <button
                          type="button"
                          className="btn btn-danger w-full sm:w-auto"
                          onClick={openDeleteAccountModal}
                          disabled={deletingAccount}
                        >
                          Eliminar cuenta
                        </button>
                      </div>
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Modal
        open={isPhotoModalOpen}
        title="Foto de perfil"
        onClose={closePhotoModal}
        size="default"
        closeLabel="Cerrar"
      >
        {avatarUrl ? (
          <div className="space-y-4">
            <img
              src={avatarUrl}
              alt={meta?.nombre || "Foto de perfil"}
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          </div>
        ) : null}
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
            Vas a eliminar tu foto de perfil actual.
          </p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">
              Esta acción no se puede deshacer.
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
              className="btn btn-sm border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 hover:text-amber-800"
              onClick={handleConfirmDeletePhoto}
              disabled={deletingPhoto}
            >
              {deletingPhoto ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isLeaveAdvertiserModalOpen}
        title="Confirmar cambio de rol"
        onClose={closeLeaveAdvertiserModal}
        size="md"
        tone="default"
        closeLabel="Cancelar"
        closeOnOverlay={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-ui-text-secondary">
            Vas a dejar de ser anunciante y tu cuenta volverá a rol usuario.
          </p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">
              Esta acción solo está permitida si no tienes pisos activos.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeLeaveAdvertiserModal}
              disabled={changingRole}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn btn-sm border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 hover:text-amber-800"
              onClick={handleConfirmLeaveAdvertiser}
              disabled={changingRole}
            >
              {changingRole ? "Procesando..." : "Sí, continuar"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isDeleteAccountModalOpen}
        title="Eliminar cuenta"
        onClose={closeDeleteAccountModal}
        size="md"
        tone="default"
        closeLabel="Cancelar"
        closeOnOverlay={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-ui-text-secondary">
            Vas a eliminar tu cuenta. Se cerrará tu sesión y no podrás acceder con este usuario.
          </p>

          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-800">
              Esta acción no se puede deshacer desde la aplicación.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeDeleteAccountModal}
              disabled={deletingAccount}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleConfirmDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? "Eliminando..." : "Sí, eliminar cuenta"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
