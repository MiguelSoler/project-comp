import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import Modal from "../../components/ui/Modal.jsx";
import {
  addAdminHabitacionFoto,
  deleteAdminHabitacionFoto,
  getAdminHabitacionById,
  updateAdminHabitacion,
} from "../../services/adminHabitacionService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

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

export default function HabitacionManagerDetail() {
  const { habitacionId } = useParams();
  const navigate = useNavigate();

  const [habitacion, setHabitacion] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadForm, setUploadForm] = useState(EMPTY_UPLOAD_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const [fotoToDelete, setFotoToDelete] = useState(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

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

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function uploadPhotoFile(file) {
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setError("");
      setSuccess("");

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
      setSuccess("Foto subida correctamente.");
    } catch (err) {
      setError(err?.error || err?.message || "No se pudo subir la foto.");
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

  function handleUploadPhoto(event) {
    event.preventDefault();
  }

  function requestDeletePhoto(foto) {
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
      setError("");
      setSuccess("");

      await deleteAdminHabitacionFoto(habitacionId, fotoToDelete.id);

      setFotos((prev) => prev.filter((foto) => foto.id !== fotoToDelete.id));
      setFotoToDelete(null);
      setSuccess("Foto eliminada correctamente.");
    } catch (err) {
      setError(err?.error || err?.message || "No se pudo eliminar la foto.");
    } finally {
      setDeletingPhotoId(null);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

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
      setSuccess("Habitación actualizada correctamente.");
    } catch (err) {
      setError(err?.error || err?.message || "No se pudo actualizar la habitación.");
    } finally {
      setSaving(false);
    }
  }

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
          </div>
        ) : habitacion ? (
          <>
            <div className="card">
              <div className="card-body space-y-4">
                {fotos.length > 0 ? (
                  <img
                    src={buildImageUrl(fotos[0].url)}
                    alt={habitacion.titulo || `Habitación ${habitacion.id}`}
                    className="aspect-[16/6] w-full rounded-lg object-cover"
                  />
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
                    <span className={habitacion.activo ? "badge badge-success" : "badge badge-neutral"}>
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="card">
                <div className="card-body">
                  <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                    Precio mensual
                  </p>
                  <p className="mt-2 text-2xl font-bold text-ui-text">
                    {formatEur(habitacion.precio_mensual)}
                  </p>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                    Tamaño
                  </p>
                  <p className="mt-2 text-2xl font-bold text-ui-text">
                    {habitacion.tamano_m2 ? `${habitacion.tamano_m2} m²` : "—"}
                  </p>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                    Piso
                  </p>
                  <p className="mt-2 text-2xl font-bold text-ui-text">#{habitacion.piso_id}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-ui-text">Editar habitación</h3>
                </div>

                {success ? <div className="alert-success">{success}</div> : null}

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

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-ui-text">Fotos de la habitación</h3>
                <span className="text-xs text-ui-text-secondary">Total: {fotos.length}</span>
              </div>

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

                  <form className="space-y-4" onSubmit={handleUploadPhoto}>
                    <label
                      htmlFor="foto"
                      onDragOver={handlePhotoDragOver}
                      onDragLeave={handlePhotoDragLeave}
                      onDrop={handlePhotoDrop}
                      className={`flex min-h-[160px] cursor-pointer items-center justify-center rounded-lg border border-dashed px-4 py-6 text-center transition-colors ${
                        isDraggingPhoto
                          ? "border-brand-primary bg-blue-50"
                          : "border-ui-border bg-slate-50 hover:bg-slate-100"
                      }`}
                    >
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-ui-text">
                          {uploadForm.foto ? uploadForm.foto.name : "Haz clic o arrastra una foto aquí"}
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
                  {fotos.map((foto) => (
                    <article key={foto.id} className="card">
                      <div className="card-body space-y-3">
                        <img
                          src={buildImageUrl(foto.url)}
                          alt={`Foto ${foto.orden}`}
                          className="aspect-[4/3] w-full rounded-md object-cover"
                        />

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-ui-text">Orden {foto.orden}</span>
                          <span className="text-xs text-ui-text-secondary">ID #{foto.id}</span>
                        </div>

                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={deletingPhotoId === foto.id}
                            onClick={() => requestDeletePhoto(foto)}
                          >
                            {deletingPhotoId === foto.id ? "Eliminando..." : "Eliminar foto"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
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
            Vas a eliminar esta foto de la habitación. Esta acción no se puede deshacer.
          </p>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              Foto #{fotoToDelete?.id} · orden {fotoToDelete?.orden}
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
    </>
  );
}