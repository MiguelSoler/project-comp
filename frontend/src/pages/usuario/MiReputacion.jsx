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
      wrapper: "rounded-xl border border-emerald-200 bg-emerald-50 p-4",
      title: "text-emerald-700",
      row: "text-emerald-800",
      count: "text-ui-text",
    },
    amber: {
      wrapper: "rounded-xl border border-amber-200 bg-amber-50 p-4",
      title: "text-amber-700",
      row: "text-amber-800",
      count: "text-ui-text",
    },
    sky: {
      wrapper: "rounded-xl border border-sky-200 bg-sky-50 p-4",
      title: "text-sky-700",
      row: "text-sky-800",
      count: "text-ui-text",
    },
    slate: {
      wrapper: "rounded-xl border border-slate-200 bg-slate-50 p-4",
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
                <div className="flex items-center gap-4">
                  <div className="skeleton h-20 w-20 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-6 w-1/3" />
                    <div className="skeleton h-4 w-1/4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-slate-300 bg-slate-50 p-4">
                  <div className="skeleton h-4 w-1/2" />
                  <div className="mt-3 skeleton h-8 w-1/3" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-slate-300 bg-slate-50 p-4">
                  <div className="skeleton h-5 w-1/2" />
                  <div className="mt-4 space-y-2">
                    {Array.from({ length: 5 }).map((__, rowIndex) => (
                      <div key={rowIndex} className="skeleton h-4 w-full" />
                    ))}
                  </div>
                </div>
              ))}
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
              <h1>Mi reputación</h1>
              <p className="text-sm text-ui-text-secondary">
                Consulta el resumen de valoraciones que has recibido de tus convivientes.
              </p>
            </header>

            {error ? <div className="alert-error">{error}</div> : null}

            {!error ? (
              <>
                <div className="card">
                  <div className="card-body space-y-4">
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

                      <div className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                          Valoraciones recibidas
                        </p>
                        <p className="mt-1 text-2xl font-bold text-ui-text">
                          {totalVotes}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {totalVotes === 0 ? (
                  <div className="card">
                    <div className="card-body">
                      <p className="text-ui-text-secondary">
                        Todavía no has recibido ningún voto.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50">
                        <div className="card-body">
                          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                            Limpieza
                          </p>
                          <p className="mt-2 text-3xl font-bold text-ui-text">
                            {formatAverage(medias.limpieza)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-amber-300 bg-amber-50">
                        <div className="card-body">
                          <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
                            Ruido
                          </p>
                          <p className="mt-2 text-3xl font-bold text-ui-text">
                            {formatAverage(medias.ruido)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-sky-300 bg-sky-50">
                        <div className="card-body">
                          <p className="text-xs font-medium uppercase tracking-wide text-sky-600">
                            Pagos
                          </p>
                          <p className="mt-2 text-3xl font-bold text-ui-text">
                            {formatAverage(medias.puntualidad_pagos)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-violet-300 bg-violet-50">
                        <div className="card-body">
                          <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
                            Total votos
                          </p>
                          <p className="mt-2 text-3xl font-bold text-ui-text">
                            {totalVotes}
                          </p>
                        </div>
                      </div>
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