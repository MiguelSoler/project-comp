import { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth.js";
import { getUserVotesSummary } from "../../services/votoUsuarioService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function buildImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function formatAverage(value) {
  return typeof value === "number" ? value.toFixed(2) : "—";
}

function DistributionBlock({ title, values }) {
  return (
    <div className="rounded-lg border border-ui-border bg-slate-50 p-4">
      <h3 className="text-base font-semibold">{title}</h3>

      <div className="mt-3 space-y-2">
        {[5, 4, 3, 2, 1].map((score) => (
          <div key={score} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-ui-text-secondary">{score}/5</span>
            <span className="font-medium text-ui-text">{values?.[score] ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MiReputacion() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) {
    return (
      <section className="section">
        <div className="app-container">
          <div className="space-y-4">
            <div className="skeleton h-8 w-56" />
            <div className="skeleton h-28 w-full" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="skeleton h-28 w-full" />
              <div className="skeleton h-28 w-full" />
              <div className="skeleton h-28 w-full" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const nombreCompleto = [profile?.nombre, profile?.apellidos].filter(Boolean).join(" ");
  const totalVotes = Number(summary?.total_votos || 0);
  const medias = summary?.medias || {};
  const distribucion = summary?.distribucion || {};

  return (
    <section className="section">
      <div className="app-container">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="space-y-3">
            <h1>Mi reputación</h1>
            <p className="text-sm text-ui-text-secondary">
              Consulta el resumen de valoraciones que has recibido de tus convivientes.
            </p>
          </header>

          {error ? <div className="alert-error">{error}</div> : null}

          {!error ? (
            <>
              <div className="card">
                <div className="card-body">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      {profile?.foto_perfil_url ? (
                        <img
                          src={buildImageUrl(profile.foto_perfil_url)}
                          alt={nombreCompleto || "Usuario"}
                          className="h-20 w-20 rounded-full border border-ui-border object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-ui-border bg-slate-100 text-lg font-semibold text-ui-text-secondary">
                          {profile?.nombre?.slice(0, 1)?.toUpperCase() || "?"}
                        </div>
                      )}

                      <div>
                        <h2 className="text-xl font-semibold">{nombreCompleto || "Sin nombre"}</h2>
                        <p className="text-sm text-ui-text-secondary">
                          Total de votos recibidos:{" "}
                          <span className="font-medium text-ui-text">{totalVotes}</span>
                        </p>
                      </div>
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
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-ui-border bg-white p-4 shadow-card">
                      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                        Media de limpieza
                      </p>
                      <p className="mt-2 text-3xl font-bold text-ui-text">
                        {formatAverage(medias.limpieza)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-ui-border bg-white p-4 shadow-card">
                      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                        Media de ruido
                      </p>
                      <p className="mt-2 text-3xl font-bold text-ui-text">
                        {formatAverage(medias.ruido)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-ui-border bg-white p-4 shadow-card">
                      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                        Media de pagos
                      </p>
                      <p className="mt-2 text-3xl font-bold text-ui-text">
                        {formatAverage(medias.puntualidad_pagos)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <DistributionBlock
                      title="Distribución de limpieza"
                      values={distribucion.limpieza}
                    />
                    <DistributionBlock
                      title="Distribución de ruido"
                      values={distribucion.ruido}
                    />
                    <DistributionBlock
                      title="Distribución de pagos"
                      values={distribucion.puntualidad_pagos}
                    />
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}