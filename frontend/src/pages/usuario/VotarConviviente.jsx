import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getMyStay } from "../../services/usuarioService.js";
import { listConvivientesByPiso } from "../../services/usuarioHabitacionService.js";
import {
  createOrUpdateVote,
  listMyVotes,
} from "../../services/votoUsuarioAuthService.js";
import useAuth from "../../hooks/useAuth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const INITIAL_FORM = {
  limpieza: "3",
  ruido: "3",
  puntualidad_pagos: "3",
};

function buildImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function getVoteErrorMessage(err) {
  switch (err?.error) {
    case "SELF_VOTE_NOT_ALLOWED":
      return "No puedes votarte a ti mismo.";
    case "NO_COHABITATION":
      return "No puedes votar a este usuario porque no consta convivencia válida en el mismo piso.";
    case "VALIDATION_ERROR":
      return "Revisa los valores del voto antes de guardarlo.";
    case "NOT_FOUND":
      return "No se encontró la información necesaria para guardar el voto.";
    default:
      return err?.message || "No se pudo guardar el voto.";
  }
}

export default function VotarConviviente() {
  const navigate = useNavigate();
  const { usuarioId } = useParams();
  const { user } = useAuth();

  const [stay, setStay] = useState(null);
  const [convivientes, setConvivientes] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const stayData = await getMyStay();
        const currentStay = stayData?.stay || null;

        if (!isMounted) return;
        setStay(currentStay);

        const pisoId = currentStay?.piso_id;
        if (!pisoId) {
          setConvivientes([]);
          setForm(INITIAL_FORM);
          return;
        }

        const convivientesData = await listConvivientesByPiso(pisoId);

        if (!isMounted) return;

        const convivientesItems = Array.isArray(convivientesData?.convivientes)
          ? convivientesData.convivientes
          : [];

        setConvivientes(convivientesItems);

        const votosData = await listMyVotes({
          page: 1,
          limit: 100,
          pisoId,
        });

        if (!isMounted) return;

        const existingVote = Array.isArray(votosData?.items)
          ? votosData.items.find((item) => Number(item.votado_id) === Number(usuarioId))
          : null;

        setForm(
          existingVote
            ? {
                limpieza: String(existingVote.limpieza),
                ruido: String(existingVote.ruido),
                puntualidad_pagos: String(existingVote.puntualidad_pagos),
              }
            : INITIAL_FORM
        );
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudo cargar la información para votar.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [usuarioId]);

  const conviviente = useMemo(() => {
    const targetId = Number(usuarioId);
    return convivientes.find((item) => Number(item.id) === targetId) || null;
  }, [convivientes, usuarioId]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!stay?.piso_id || !conviviente?.id) {
      setError("No se ha encontrado un conviviente válido para votar.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        piso_id: stay.piso_id,
        votado_id: conviviente.id,
        limpieza: Number(form.limpieza),
        ruido: Number(form.ruido),
        puntualidad_pagos: Number(form.puntualidad_pagos),
      };

      const data = await createOrUpdateVote(payload);

      setSuccess(
        data?.action === "updated"
          ? "Tu voto se ha actualizado correctamente."
          : "Tu voto se ha guardado correctamente."
      );
    } catch (err) {
      setError(getVoteErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="section">
        <div className="app-container">
          <div className="card">
            <div className="card-body space-y-4">
              <div className="skeleton h-8 w-64" />
              <div className="skeleton h-24 w-full" />
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-full" />
              <div className="skeleton h-10 w-full" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!stay) {
    return (
      <section className="section">
        <div className="app-container">
          <div className="mx-auto max-w-3xl">
            <div className="card">
              <div className="card-body">
                <h1>Votar conviviente</h1>
                <p className="mt-2 text-ui-text-secondary">
                  Necesitas tener una estancia activa para poder emitir votos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!conviviente) {
    return (
      <section className="section">
        <div className="app-container">
          <div className="mx-auto max-w-3xl">
            <div className="card">
              <div className="card-body">
                <h1>Votar conviviente</h1>
                <p className="mt-2 text-ui-text-secondary">
                  No hemos encontrado a ese conviviente en tu piso actual.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const isSelf = Number(conviviente.id) === Number(user?.id);
  const nombreCompleto = [conviviente.nombre, conviviente.apellidos]
    .filter(Boolean)
    .join(" ");

  return (
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
              <h1>Votar conviviente</h1>
              <p className="text-sm text-ui-text-secondary">
                Valora convivencia en limpieza, ruido y puntualidad de pagos.
              </p>
            </div>
          </header>

          {error ? <div className="alert-error">{error}</div> : null}
          {success ? <div className="alert-success">{success}</div> : null}

          <div className="card">
            <div className="card-body space-y-6">
              <div className="flex items-start gap-4">
                {conviviente.foto_perfil_url ? (
                  <img
                    src={buildImageUrl(conviviente.foto_perfil_url)}
                    alt={nombreCompleto || "Conviviente"}
                    className="h-20 w-20 rounded-full border border-ui-border object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-ui-border bg-slate-100 text-lg font-semibold text-ui-text-secondary">
                    {conviviente.nombre?.slice(0, 1)?.toUpperCase() || "?"}
                  </div>
                )}

                <div>
                  <h2 className="text-lg font-semibold">
                    {nombreCompleto || "Sin nombre"}
                  </h2>
                  <p className="text-sm text-ui-text-secondary">
                    Habitación #{conviviente.habitacion_id}
                  </p>
                </div>
              </div>

              {isSelf ? (
                <div className="alert-warning">
                  No puedes votarte a ti mismo.
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="label" htmlFor="limpieza">
                      Limpieza
                    </label>
                    <select
                      id="limpieza"
                      name="limpieza"
                      className="select"
                      value={form.limpieza}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="1">1 - Muy mala</option>
                      <option value="2">2 - Mala</option>
                      <option value="3">3 - Normal</option>
                      <option value="4">4 - Buena</option>
                      <option value="5">5 - Muy buena</option>
                    </select>
                  </div>

                  <div>
                    <label className="label" htmlFor="ruido">
                      Ruido
                    </label>
                    <select
                      id="ruido"
                      name="ruido"
                      className="select"
                      value={form.ruido}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="1">1 - Muy molesto</option>
                      <option value="2">2 - Molesto</option>
                      <option value="3">3 - Normal</option>
                      <option value="4">4 - Bastante respetuoso</option>
                      <option value="5">5 - Muy respetuoso</option>
                    </select>
                  </div>

                  <div>
                    <label className="label" htmlFor="puntualidad_pagos">
                      Puntualidad de pagos
                    </label>
                    <select
                      id="puntualidad_pagos"
                      name="puntualidad_pagos"
                      className="select"
                      value={form.puntualidad_pagos}
                      onChange={handleChange}
                      disabled={saving}
                    >
                      <option value="1">1 - Muy impuntual</option>
                      <option value="2">2 - Impuntual</option>
                      <option value="3">3 - Normal</option>
                      <option value="4">4 - Puntual</option>
                      <option value="5">5 - Muy puntual</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                      aria-busy={saving}
                    >
                      {saving ? "Guardando..." : "Guardar voto"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}