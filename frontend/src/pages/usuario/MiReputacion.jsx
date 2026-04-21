import { useEffect, useState } from "react";
import Modal from "../../components/ui/Modal.jsx";
import useAuth from "../../hooks/useAuth.js";
import { getUserVotesSummary } from "../../services/votoUsuarioService.js";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function buildImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function formatAverage(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(1);
}

function getInitials(profile) {
  const source =
    [profile?.nombre, profile?.apellidos].filter(Boolean).join(" ") || "U";

  return source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function DistributionBlock({ title, values, tone = "slate" }) {
  const toneClasses = {
    emerald: {
      wrapper: "rounded-2xl border border-emerald-200 bg-emerald-50 p-4",
      title: "text-emerald-700",
      row: "text-emerald-800",
      count: "text-ui-text",
    },
    amber: {
      wrapper: "rounded-2xl border border-amber-200 bg-amber-50 p-4",
      title: "text-amber-700",
      row: "text-amber-800",
      count: "text-ui-text",
    },
    sky: {
      wrapper: "rounded-2xl border border-sky-200 bg-sky-50 p-4",
      title: "text-sky-700",
      row: "text-sky-800",
      count: "text-ui-text",
    },
    slate: {
      wrapper: "rounded-2xl border border-slate-200 bg-slate-50 p-4",
      title: "text-ui-text",
      row: "text-ui-text-secondary",
      count: "text-ui-text",
    },
  };

  const classes = toneClasses[tone] || toneClasses.slate;

  return (
    <div className={classes.wrapper}>
      <h3 className={`text-base font-semibold ${classes.title}`}>{title}</h3>

      <div className="mt-4 space-y-2">
        {[5, 4, 3, 2, 1].map((score) => (
          <div key={score} className="flex items-center justify-between gap-3 text-sm">
            <span className={classes.row}>{score}/5</span>
            <span className={`font-semibold ${classes.count}`}>
              {values?.[score] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, tone = "default" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-300 bg-emerald-50"
      : tone === "sky"
        ? "border-sky-300 bg-sky-50"
        : tone === "violet"
          ? "border-violet-300 bg-violet-50"
          : "border-amber-300 bg-amber-50";

  return (
    <div className={`rounded-2xl border ${toneClass}`}>
      <div className="card-body">
        <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold text-ui-text">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function MiReputacion() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSummary() {
      try {
        setLoading(true);
        setError("");

        const data = await getUserVotesSummary(user?.id);

        if (!isMounted) return;

        setProfile(data?.usuario || null);
        setSummary(data?.resumen || null);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudo cargar tu reputación.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (user?.id) {
      loadSummary();
    } else {
      setLoading(false);
      setError("No se ha podido identificar al usuario.");
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const nombreCompleto = [profile?.nombre, profile?.apellidos].filter(Boolean).join(" ");
  const totalVotes = Number(summary?.total_votos || 0);
  const medias = summary?.medias || {};
  const distribucion = summary?.distribucion || {};
  const avatarUrl = buildImageUrl(profile?.foto_perfil_url);

  if (loading) {
    return (
      <section className="section">
        <div className="app-container">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="card">
              <div className="card-body space-y-4">
                <div className="skeleton h-10 w-56" />
                <div className="skeleton h-28 w-full" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="skeleton h-24 w-full rounded-2xl" />
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body space-y-4">
                <div className="skeleton h-32 w-full rounded-2xl" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="skeleton h-40 w-full rounded-2xl" />
                  ))}
                </div>
              </div>
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
          <div className="mx-auto max-w-5xl space-y-6">
            <header className="overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 shadow-sm">
              <div className="flex flex-col gap-4 p-6 md:flex-row md:items-start md:justify-between md:p-8">
                <div className="space-y-3">
                  <div className="inline-flex rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
                    Zona personal
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-ui-text">
                      Mi reputación
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-ui-text-secondary">
                      Consulta el resumen de valoraciones que has recibido de tus
                      convivientes y cómo se distribuyen tus puntuaciones.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(-1)}
                  >
                    Volver
                  </button>
                </div>
              </div>
            </header>

            {error ? <div className="alert-error">{error}</div> : null}

            {!error ? (
              <>
                <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-sm">
                  <div className="card-body space-y-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        {avatarUrl ? (
                          <button
                            type="button"
                            className="block"
                            onClick={() => setIsPhotoModalOpen(true)}
                            aria-label="Ver foto de perfil"
                          >
                            <img
                              src={avatarUrl}
                              alt={nombreCompleto || "Usuario"}
                              className="h-20 w-20 rounded-full border border-ui-border object-cover"
                            />
                          </button>
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-brand-primary">
                            {getInitials(profile)}
                          </div>
                        )}

                        <div className="space-y-2">
                          <h2 className="text-xl font-semibold text-ui-text">
                            {nombreCompleto || "Sin nombre"}
                          </h2>
                          <p className="text-sm text-ui-text-secondary">
                            Total de votos recibidos:{" "}
                            <span className="font-semibold text-ui-text">{totalVotes}</span>
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-violet-300 bg-violet-50 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                          Valoraciones recibidas
                        </p>
                        <p className="mt-1 text-2xl font-bold text-ui-text">
                          {totalVotes}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm text-emerald-800">
                        Aquí ves una visión global de cómo te perciben tus convivientes
                        en limpieza, ruido y puntualidad de pagos.
                      </p>
                    </div>
                  </div>
                </div>

                {totalVotes === 0 ? (
                  <div className="rounded-3xl border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-sm">
                    <div className="card-body space-y-3">
                      <div className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Sin valoraciones
                      </div>

                      <h2 className="text-lg font-semibold text-ui-text">
                        Todavía no has recibido ningún voto
                      </h2>

                      <p className="text-sm text-ui-text-secondary">
                        Cuando tus convivientes empiecen a valorarte, verás aquí tus
                        medias y la distribución de puntuaciones.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <SummaryCard
                        label="Limpieza"
                        value={formatAverage(medias.limpieza)}
                        tone="emerald"
                      />
                      <SummaryCard
                        label="Ruido"
                        value={formatAverage(medias.ruido)}
                        tone="default"
                      />
                      <SummaryCard
                        label="Pagos"
                        value={formatAverage(medias.puntualidad_pagos)}
                        tone="sky"
                      />
                      <SummaryCard
                        label="Total votos"
                        value={totalVotes}
                        tone="violet"
                      />
                    </div>

                    <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 shadow-sm">
                      <div className="card-body space-y-5">
                        <div>
                          <div className="inline-flex rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                            Distribución
                          </div>

                          <h2 className="mt-3 text-xl font-bold tracking-tight text-ui-text">
                            Desglose de puntuaciones
                          </h2>

                          <p className="mt-1 text-sm text-ui-text-secondary">
                            Así se reparten tus votos recibidos en cada métrica.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <DistributionBlock
                            title="Distribución de limpieza"
                            values={distribucion.limpieza}
                            tone="emerald"
                          />

                          <DistributionBlock
                            title="Distribución de ruido"
                            values={distribucion.ruido}
                            tone="amber"
                          />

                          <DistributionBlock
                            title="Distribución de pagos"
                            values={distribucion.puntualidad_pagos}
                            tone="sky"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      </section>

      <Modal
        open={isPhotoModalOpen}
        title="Foto de perfil"
        onClose={() => setIsPhotoModalOpen(false)}
        size="default"
        closeLabel="Cerrar"
      >
        {avatarUrl ? (
          <div className="space-y-4">
            <img
              src={avatarUrl}
              alt={nombreCompleto || "Usuario"}
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}