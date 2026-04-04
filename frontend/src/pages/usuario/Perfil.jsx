import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/ui/Modal.jsx";
import {
  getMyProfile,
  updateMyProfile,
  updateMyProfileFoto,
  deleteMyProfileFoto,
  dejarDeSerAdvertiser,
} from "../../services/usuarioService.js";
import useAuth from "../../hooks/useAuth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const EMPTY_FORM = {
  nombre: "",
  apellidos: "",
  email: "",
  telefono: "",
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

export default function Perfil() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { setUser, setSession } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [meta, setMeta] = useState(null);

  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [photoFeedback, setPhotoFeedback] = useState(null);
  const [roleFeedback, setRoleFeedback] = useState(null);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isDeletePhotoModalOpen, setIsDeletePhotoModalOpen] = useState(false);
  const [isLeaveAdvertiserModalOpen, setIsLeaveAdvertiserModalOpen] = useState(false);

  const avatarUrl = buildImageUrl(meta?.foto_perfil_url);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);
        setPhotoFeedback(null);
        setRoleFeedback(null);

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

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
      setRoleFeedback(null);

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
      setRoleFeedback(null);

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
    setRoleFeedback(null);
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
      setRoleFeedback(null);

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
    setRoleFeedback(null);
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
      setRoleFeedback(null);

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
          <div className="mx-auto max-w-3xl space-y-6">
            <header className="space-y-3">
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(-1)}
                >
                  Volver
                </button>
              </div>
              
              <div>
                <h1>Mi perfil</h1>
                <p className="text-sm text-ui-text-secondary">
                  Consulta y actualiza tus datos personales.
                </p>
              </div>
            </header>

            {error ? <div className="alert-error">{error}</div> : null}
            {success ? <div className="alert-success">{success}</div> : null}
            {photoFeedback ? (
              <div className={photoFeedback.type === "success" ? "alert-success" : "alert-error"}>
                {photoFeedback.message}
              </div>
            ) : null}
            {roleFeedback ? (
              <div className={roleFeedback.type === "success" ? "alert-success" : "alert-error"}>
                {roleFeedback.message}
              </div>
            ) : null}

            <div className="card">
              <div className="card-body space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
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
                          className="h-20 w-20 rounded-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-brand-primary">
                        {getInitials(meta)}
                      </div>
                    )}

                    <div>
                      <p className="text-lg font-semibold text-ui-text">
                        {[meta?.nombre, meta?.apellidos].filter(Boolean).join(" ") || "Usuario"}
                      </p>
                      <p className="text-sm text-ui-text-secondary">
                        {meta?.email || "—"}
                      </p>
                      <p className="mt-1 text-xs text-ui-text-secondary">
                        Rol: {formatRoleLabel(meta?.rol)}
                      </p>
                    </div>
                  </div>
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

                  <div className="flex items-center justify-end">
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
              </div>
            </div>

            <div className="card">
              <div className="card-body space-y-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-ui-text">
                    Foto de perfil
                  </h2>
                  <p className="mt-1 text-sm text-ui-text-secondary">
                    Sube una nueva imagen o elimina la foto actual.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-ui-text-secondary">
                      {selectedPhotoFile
                        ? `Nueva foto seleccionada: ${selectedPhotoFile.name}`
                        : meta?.foto_perfil_url
                          ? "Ya tienes una foto de perfil."
                          : "Todavía no has subido ninguna foto de perfil."}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
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
              </div>
            </div>

            {meta?.rol === "user" ? (
              <div className="card">
                <div className="card-body space-y-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-ui-text">
                      Convertirse en anunciante
                    </h2>
                    <p className="mt-1 text-sm text-ui-text-secondary">
                      Crea tu primer piso y tu cuenta pasará a rol anunciante.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => navigate("/convertirse-anunciante")}
                    >
                      Empezar
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {meta?.rol === "advertiser" ? (
              <div className="card">
                <div className="card-body space-y-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-ui-text">
                      Dejar de ser anunciante
                    </h2>
                    <p className="mt-1 text-sm text-ui-text-secondary">
                      Volverás a rol usuario. Antes debes asegurarte de no tener pisos activos.
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={openLeaveAdvertiserModal}
                    >
                      Dejar de ser anunciante
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
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
              className="btn btn-sm border border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200"
              onClick={handleConfirmLeaveAdvertiser}
              disabled={changingRole}
            >
              {changingRole ? "Procesando..." : "Sí, continuar"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}