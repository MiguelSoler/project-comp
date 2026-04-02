import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/ui/Modal.jsx";
import {
  getMyProfile,
  updateMyProfile,
  dejarDeSerAdvertiser,
} from "../../services/usuarioService.js";
import useAuth from "../../hooks/useAuth.js";

const EMPTY_FORM = {
  nombre: "",
  telefono: "",
  foto_perfil_url: "",
};

function formatRoleLabel(rol) {
  if (rol === "admin") return "Admin";
  if (rol === "advertiser") return "Anunciante";
  if (rol === "user") return "Usuario";
  return "—";
}

export default function Perfil() {
  const navigate = useNavigate();
  const { setUser, setSession } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [meta, setMeta] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingRole, setChangingRole] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [roleFeedback, setRoleFeedback] = useState(null);

  const [isLeaveAdvertiserModalOpen, setIsLeaveAdvertiserModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);
        setRoleFeedback(null);

        const data = await getMyProfile();
        const user = data?.user || null;

        if (!isMounted) return;

        setMeta(user);
        setForm({
          nombre: user?.nombre || "",
          telefono: user?.telefono || "",
          foto_perfil_url: user?.foto_perfil_url || "",
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

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      setRoleFeedback(null);

      const payload = {
        nombre: form.nombre,
        telefono: form.telefono,
        foto_perfil_url: form.foto_perfil_url,
      };

      const data = await updateMyProfile(payload);
      const updatedUser = data?.user || null;

      setMeta(updatedUser);
      setForm({
        nombre: updatedUser?.nombre || "",
        telefono: updatedUser?.telefono || "",
        foto_perfil_url: updatedUser?.foto_perfil_url || "",
      });

      if (updatedUser) {
        setUser(updatedUser);
      }

      setSuccess("Perfil actualizado correctamente.");
    } catch (err) {
      setError(err?.message || "No se pudo actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  function openLeaveAdvertiserModal() {
    setError(null);
    setSuccess(null);
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
      setRoleFeedback(null);

      const data = await dejarDeSerAdvertiser();

      if (data?.token && data?.user) {
        setSession(data.token, data.user);
        setMeta(data.user);
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
            <header className="space-y-2">
              <h1>Mi perfil</h1>
              <p className="text-sm text-ui-text-secondary">
                Consulta y actualiza tus datos personales.
              </p>
            </header>

            {error ? <div className="alert-error">{error}</div> : null}
            {success ? <div className="alert-success">{success}</div> : null}
            {roleFeedback ? (
              <div className={roleFeedback.type === "success" ? "alert-success" : "alert-error"}>
                {roleFeedback.message}
              </div>
            ) : null}

            <div className="card">
              <div className="card-body space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                      Email
                    </p>
                    <p className="mt-1">{meta?.email || "—"}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                      Rol
                    </p>
                    <p className="mt-1">{formatRoleLabel(meta?.rol)}</p>
                  </div>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
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

                  <div>
                    <label className="label" htmlFor="foto_perfil_url">
                      URL de foto de perfil
                    </label>
                    <input
                      id="foto_perfil_url"
                      name="foto_perfil_url"
                      type="text"
                      className="input"
                      value={form.foto_perfil_url}
                      onChange={handleChange}
                      disabled={saving}
                    />
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