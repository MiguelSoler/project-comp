import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import { convertirmeEnAdvertiser } from "../../services/usuarioService.js";
import useAuth from "../../hooks/useAuth.js";

const EMPTY_FORM = {
  direccion: "",
  ciudad: "",
  codigo_postal: "",
  descripcion: "",
};

function getFriendlyErrorMessage(err) {
  switch (err?.error) {
    case "VALIDATION_ERROR":
      return "Debes completar al menos la dirección y la ciudad.";
    case "USER_HAS_ACTIVE_STAY":
      return "No puedes convertirte en anunciante mientras tengas una estancia activa.";
    case "ROLE_ALREADY_UPGRADED":
      return "Tu cuenta ya no tiene rol de usuario.";
    case "USER_INACTIVE":
      return "Tu cuenta está inactiva.";
    default:
      return err?.message || "No se pudo completar la conversión a anunciante.";
  }
}

export default function ConvertirseEnAdvertiser() {
  const navigate = useNavigate();
  const { user, setSession } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const payload = {
        direccion: form.direccion.trim(),
        ciudad: form.ciudad.trim(),
        codigo_postal: form.codigo_postal.trim() || null,
        descripcion: form.descripcion.trim() || null,
      };

      const data = await convertirmeEnAdvertiser(payload);

      if (data?.token && data?.user) {
        setSession(data.token, data.user);
      }

      const pisoId = data?.piso?.id;
      if (pisoId) {
        navigate(`/manager/piso/${pisoId}`);
        return;
      }

      navigate("/manager");
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Convertirse en anunciante"
      subtitle="Crea tu primer piso y tu cuenta pasará a rol anunciante."
      variant="plain"
      contentClassName="space-y-6"
      actions={
        <Link to="/perfil" className="btn btn-secondary btn-sm">
          Volver
        </Link>
      }
    >
      {error ? <div className="alert-error">{error}</div> : null}

      <div className="card">
        <div className="card-body space-y-6">
          <div className="rounded-xl border border-sky-300 bg-sky-50 p-4">
            <p className="text-sm text-sky-800">
              Vas a crear tu primer piso como anunciante. Cuando el proceso termine,
              tu cuenta cambiará de rol automáticamente.
            </p>
            <p className="mt-2 text-xs text-sky-700">
              Usuario actual: <span className="font-semibold">{user?.email || "—"}</span>
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
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
                  value={form.direccion}
                  onChange={handleChange}
                  disabled={saving}
                  placeholder="Ej. Calle Mayor 12, 3ºA"
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
                  value={form.ciudad}
                  onChange={handleChange}
                  disabled={saving}
                  placeholder="Ej. Madrid"
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
                  value={form.codigo_postal}
                  onChange={handleChange}
                  disabled={saving}
                  placeholder="Ej. 28013"
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
                  placeholder="Describe brevemente el piso"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Link to="/perfil" className="btn btn-secondary">
                Cancelar
              </Link>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                aria-busy={saving}
              >
                {saving ? "Creando piso..." : "Crear piso y convertirme en anunciante"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}