import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

const RATING_LABELS = {
  limpieza: {
    1: "Muy mala",
    2: "Mala",
    3: "Normal",
    4: "Buena",
    5: "Muy buena",
  },
  ruido: {
    1: "Muy molesto",
    2: "Molesto",
    3: "Normal",
    4: "Bastante respetuoso",
    5: "Muy respetuoso",
  },
  puntualidad_pagos: {
    1: "Muy impuntual",
    2: "Impuntual",
    3: "Normal",
    4: "Puntual",
    5: "Muy puntual",
  },
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

function RatingField({ name, title, value, onChange, disabled }) {
  const numericValue = Number(value) || 0;
  const currentLabel = RATING_LABELS[name]?.[numericValue] || "Sin valorar";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="space-y-3">
        <div>
          <label className="label mb-0">{title}</label>
          <p className="mt-1 text-xs text-ui-text-secondary">
            Selecciona de 1 a 5 estrellas.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5].map((score) => {
              const active = score <= numericValue;

              return (
                <button
                  key={score}
                  type="button"
                  onClick={() => onChange(name, String(score))}
                  disabled={disabled}
                  aria-label={`${title}: ${score} estrellas`}
                  aria-pressed={score === numericValue}
                  className={`group relative flex h-11 w-11 items-center justify-center rounded-full border text-[30px] transition-all duration-200 ${
                    active
                      ? "border-amber-300 bg-amber-50 text-amber-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_10px_rgba(245,158,11,0.12)]"
                      : "border-slate-300    : border-slate-300 bg-white text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.05)] hover:border-amber-200 hover:bg-amber-50/70 hover:text-amber-400 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_10px_rgba(245,158,11,0.08)]"
                  } ${
                    disabled ? "cursor-not-allowed opacity-70" : "hover:-translate-y-0.5"
                  }`}
                >
                  <span
                    className={`transition-transform duration-200 ${
                      active ? "scale-105" : "scale-100 group-hover:scale-105"
                    }`}
                  >
                    ★
                  </span>
                </button>
              );
            })}
          </div>

          <div className="min-w-[170px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <span className="font-semibold text-ui-text">{numericValue}</span>
            <span className="text-ui-text-secondary"> · {currentLabel}</span>
          </div>
        </div>

        <div className="text-xs text-ui-text-secondary">
          1 = {RATING_LABELS[name][1]}  ·  2 = {RATING_LABELS[name][2]}  ·  3 = {RATING_LABELS[name][3]}  ·  4 = {RATING_LABELS[name][4]}  ·  5 = {RATING_LABELS[name][5]}
        </div>
      </div>
    </div>
  );
}

export default function VotarConviviente() {
  const { usuarioId } = useParams();
  const navigate = useNavigate();
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

  function handleRatingChange(name, value) {
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
          <div className="card mx-auto max-w-4xl">
            <div className="card-body space-y-4">
              <div className="skeleton h-8 w-64" />
              <div className="skeleton h-24 w-full" />
              <div className="skeleton h-32 w-full" />
              <div className="skeleton h-32 w-full" />
              <div className="skeleton h-32 w-full" />
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
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex items-center justify-end">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate(-1)}
              >
                Volver
              </button>
            </div>

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
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex items-center justify-end">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => navigate(-1)}
              >
                Volver
              </button>
            </div>

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
        <div className="mx-auto max-w-5xl space-y-6">
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
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-4">
                  {conviviente.foto_perfil_url ? (
                    <img
                      src={buildImageUrl(conviviente.foto_perfil_url)}
                      alt={nombreCompleto || "Conviviente"}
                      className="h-20 w-20 rounded-full border border-ui-border object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-brand-primary">
                      {conviviente.nombre?.slice(0, 1)?.toUpperCase() || "?"}
                    </div>
                  )}

                  <div className="min-w-0">
                    <h2 className="text-2xl font-semibold text-ui-text">
                      {nombreCompleto || "Sin nombre"}
                    </h2>
                    <p className="mt-1 text-sm text-ui-text-secondary">
                      Habitación #{conviviente.habitacion_id}
                    </p>
                  </div>
                </div>
              </div>

              {isSelf ? (
                <div className="alert-warning">
                  No puedes votarte a ti mismo.
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <RatingField
                    name="limpieza"
                    title="Limpieza"
                    value={form.limpieza}
                    onChange={handleRatingChange}
                    disabled={saving}
                  />

                  <RatingField
                    name="ruido"
                    title="Ruido"
                    value={form.ruido}
                    onChange={handleRatingChange}
                    disabled={saving}
                  />

                  <RatingField
                    name="puntualidad_pagos"
                    title="Puntualidad de pagos"
                    value={form.puntualidad_pagos}
                    onChange={handleRatingChange}
                    disabled={saving}
                  />

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