import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MetricSummaryCard from "../../components/ui/MetricSummaryCard.jsx";
import Modal from "../../components/ui/Modal.jsx";
import {
  getUserVotesSummary,
  listReceivedVotes,
} from "../../services/votoUsuarioService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function buildImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function formatRoleLabel(rol) {
  if (rol === "admin") return "Admin";
  if (rol === "advertiser") return "Anunciante";
  if (rol === "user") return "Usuario";
  return "—";
}

function getRoleBadgeClassName(rol) {
  if (rol === "admin") return "badge badge-info";
  if (rol === "advertiser") return "badge badge-warning";
  if (rol === "user") return "badge badge-neutral";
  return "badge badge-neutral";
}

function getInitials(usuario) {
  const source =
    [usuario?.nombre, usuario?.apellidos].filter(Boolean).join(" ") || "U";

  return source
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatMetric(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(1);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getVoteIsCurrentCohabitant(vote) {
  return Boolean(
    vote?.is_current_cohabitant ??
      vote?.es_actual ??
      vote?.is_current ??
      vote?.can_view_profile
  );
}

function getVoteIntervalLabel(vote) {
  const start =
    vote?.fecha_inicio_convivencia ||
    vote?.convivencia_fecha_inicio ||
    vote?.convivencia?.fecha_inicio ||
    vote?.fecha_entrada;
  const end =
    vote?.fecha_fin_convivencia ||
    vote?.convivencia_fecha_fin ||
    vote?.convivencia?.fecha_fin ||
    vote?.fecha_salida;

  if (start && end) {
    return `Han convivido desde ${formatDate(start)} hasta ${formatDate(end)}`;
  }

  if (start) {
    return `Han convivido desde ${formatDate(start)} hasta la actualidad`;
  }

  if (end) {
    return `Han convivido hasta ${formatDate(end)}`;
  }

  return "Han convivido en el piso de este voto";
}

function getUsuarioPublicDetailErrorMessage(error) {
  const code = error?.error || error?.message;

  switch (code) {
    case "FORBIDDEN_CURRENT_PROFILE":
      return "No puedes ver la reputación actual de este usuario porque ya no convivís actualmente.";
    case "NOT_FOUND":
      return "No se encontró el usuario.";
    default:
      return "No se pudo cargar el perfil del usuario.";
  }
}

export default function UsuarioPublicDetail() {
  const { usuarioId } = useParams();
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [summary, setSummary] = useState(null);
  const [votes, setVotes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedPhoto, setSelectedPhoto] = useState({ url: "", alt: "" });

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [summaryData, votesData] = await Promise.all([
          getUserVotesSummary(usuarioId),
          listReceivedVotes(usuarioId, { page: 1, limit: 12, sort: "newest" }),
        ]);

        if (!isMounted) return;

        setUsuario(summaryData?.usuario || votesData?.usuario || null);
        setSummary(summaryData?.resumen || null);
        setVotes(Array.isArray(votesData?.items) ? votesData.items : []);
      } catch (err) {
        if (!isMounted) return;
        setError(getUsuarioPublicDetailErrorMessage(err));
        setUsuario(null);
        setSummary(null);
        setVotes([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [usuarioId]);

  const avatarUrl = buildImageUrl(usuario?.foto_perfil_url);
  const totalVotos = Number(summary?.total_votos || 0);
  const mediaLimpieza = summary?.medias?.limpieza ?? null;
  const mediaRuido = summary?.medias?.ruido ?? null;
  const mediaPagos = summary?.medias?.puntualidad_pagos ?? null;

  function openPhotoModal(url, alt) {
    if (!url) return;
    setSelectedPhoto({ url, alt: alt || "Foto de perfil" });
  }

  function closePhotoModal() {
    setSelectedPhoto({ url: "", alt: "" });
  }

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

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-slate-300 bg-slate-50 p-4">
                  <div className="skeleton h-4 w-1/2" />
                  <div className="mt-3 skeleton h-8 w-1/3" />
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
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-ui-text">
                  Reputación de usuario
                </h1>
                <p className="mt-1 text-sm text-ui-text-secondary">
                  Consulta las valoraciones recibidas y la convivencia asociada a cada voto.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm w-full sm:w-auto"
                onClick={() => navigate(-1)}
              >
                Volver
              </button>
            </header>

            {error ? <div className="alert-error">{error}</div> : null}

            {usuario ? (
              <>
                <div className="card">
                  <div className="card-body space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-center gap-4">
                        {avatarUrl ? (
                          <button
                            type="button"
                            className="block"
                            onClick={() =>
                              openPhotoModal(
                                avatarUrl,
                                [usuario.nombre, usuario.apellidos].filter(Boolean).join(" ")
                              )
                            }
                            aria-label="Ver foto de perfil"
                          >
                            <img
                              src={avatarUrl}
                              alt={[usuario.nombre, usuario.apellidos].filter(Boolean).join(" ")}
                              className="h-20 w-20 rounded-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-brand-primary">
                            {getInitials(usuario)}
                          </div>
                        )}

                        <div className="space-y-2">
                          <h1 className="text-2xl font-bold tracking-tight text-ui-text">
                            {[usuario.nombre, usuario.apellidos].filter(Boolean).join(" ") || "Usuario"}
                          </h1>

                          {usuario.rol ? (
                            <span className={getRoleBadgeClassName(usuario.rol)}>
                              {formatRoleLabel(usuario.rol)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
                  <MetricSummaryCard
                    label="Limpieza"
                    value={formatMetric(mediaLimpieza)}
                    tone="emerald"
                    bodyClassName="p-2 sm:p-4"
                    labelClassName="text-[10px] font-medium uppercase leading-tight tracking-wide text-ui-text-secondary sm:text-xs"
                    valueClassName="mt-1 text-lg font-bold text-ui-text sm:mt-2 sm:text-2xl"
                    description="Media de valoraciones recibidas sobre limpieza y cuidado de los espacios compartidos."
                  />
                  <MetricSummaryCard
                    label="Ruido"
                    value={formatMetric(mediaRuido)}
                    tone="default"
                    bodyClassName="p-2 sm:p-4"
                    labelClassName="text-[10px] font-medium uppercase leading-tight tracking-wide text-ui-text-secondary sm:text-xs"
                    valueClassName="mt-1 text-lg font-bold text-ui-text sm:mt-2 sm:text-2xl"
                    description="Media de valoraciones recibidas sobre respeto del descanso y nivel de ruido."
                  />
                  <MetricSummaryCard
                    label="Pagos"
                    value={formatMetric(mediaPagos)}
                    tone="sky"
                    bodyClassName="p-2 sm:p-4"
                    labelClassName="text-[10px] font-medium uppercase leading-tight tracking-wide text-ui-text-secondary sm:text-xs"
                    valueClassName="mt-1 text-lg font-bold text-ui-text sm:mt-2 sm:text-2xl"
                    description="Media de valoraciones recibidas sobre puntualidad en pagos y gastos compartidos."
                  />
                  <MetricSummaryCard
                    label="Total votos"
                    value={totalVotos}
                    tone="violet"
                    bodyClassName="p-2 sm:p-4"
                    labelClassName="text-[10px] font-medium uppercase leading-tight tracking-wide text-ui-text-secondary sm:text-xs"
                    valueClassName="mt-1 text-lg font-bold text-ui-text sm:mt-2 sm:text-2xl"
                    description="Numero total de votos recibidos que forman parte de la reputación visible."
                  />
                </div>

                {votes.length === 0 ? (
                  <div className="card">
                    <div className="card-body">
                      <p className="text-sm text-ui-text-secondary">
                        Este usuario todavía no ha recibido votos.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-xl font-bold tracking-tight text-ui-text">
                        Votos recibidos
                      </h2>
                      <span className="text-xs text-ui-text-secondary">
                        Mostrando {votes.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {votes.map((vote) => {
                        const votanteNombre = [
                          vote.votante?.nombre,
                          vote.votante?.apellidos,
                        ]
                          .filter(Boolean)
                          .join(" ");
                        const isCurrentCohabitant = getVoteIsCurrentCohabitant(vote);
                        const intervalLabel = getVoteIntervalLabel(vote);

                        return (
                          <article key={vote.id} className="card">
                            <div className="card-body space-y-4">
                              {vote.can_view_profile ? (
                                <Link
                                  to={`/usuarios/${vote.votante?.id}`}
                                  className={
                                    isCurrentCohabitant
                                      ? "group block rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-md"
                                      : "group block rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-primary hover:bg-blue-50/60 hover:shadow-md"
                                  }
                                >
                                  <div className="flex items-center gap-3">
                                    {vote.votante?.foto_perfil_url ? (
                                      <button
                                        type="button"
                                        className="shrink-0"
                                        onClick={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          openPhotoModal(
                                            buildImageUrl(vote.votante.foto_perfil_url),
                                            votanteNombre || "Usuario"
                                          );
                                        }}
                                        aria-label={`Ver foto de ${votanteNombre || "usuario"}`}
                                      >
                                        <img
                                          src={buildImageUrl(vote.votante.foto_perfil_url)}
                                          alt={votanteNombre || "Usuario"}
                                          className="h-14 w-14 rounded-full object-cover"
                                        />
                                      </button>
                                    ) : (
                                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-brand-primary">
                                        {getInitials(vote.votante)}
                                      </div>
                                    )}
                              
                                    <div className="min-w-0">
                                      <p
                                        className={
                                          isCurrentCohabitant
                                            ? "truncate text-base font-semibold text-ui-text group-hover:text-emerald-800"
                                            : "truncate text-base font-semibold text-ui-text group-hover:text-brand-primary"
                                        }
                                      >
                                        {votanteNombre || "Sin nombre"}
                                      </p>
                                      <p className="truncate text-sm text-ui-text-secondary">
                                        {vote.piso?.ciudad || "—"}
                                        {vote.piso?.direccion ? ` · ${vote.piso.direccion}` : ""}
                                      </p>
                                    </div>
                                  </div>
                                </Link>
                              ) : (
                                <div className="block rounded-xl border border-slate-200 bg-slate-50 p-4">
                                  <div className="flex items-center gap-3">
                                    {vote.votante?.foto_perfil_url ? (
                                      <button
                                        type="button"
                                        className="shrink-0"
                                        onClick={() =>
                                          openPhotoModal(
                                            buildImageUrl(vote.votante.foto_perfil_url),
                                            votanteNombre || "Usuario"
                                          )
                                        }
                                        aria-label={`Ver foto de ${votanteNombre || "usuario"}`}
                                      >
                                        <img
                                          src={buildImageUrl(vote.votante.foto_perfil_url)}
                                          alt={votanteNombre || "Usuario"}
                                          className="h-14 w-14 rounded-full object-cover"
                                        />
                                      </button>
                                    ) : (
                                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-brand-primary">
                                        {getInitials(vote.votante)}
                                      </div>
                                    )}
                              
                                    <div className="min-w-0">
                                      <p className="truncate text-base font-semibold text-ui-text">
                                        {votanteNombre || "Sin nombre"}
                                      </p>
                                      <p className="truncate text-sm text-ui-text-secondary">
                                        {vote.piso?.ciudad || "—"}
                                        {vote.piso?.direccion ? ` · ${vote.piso.direccion}` : ""}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={
                                    isCurrentCohabitant
                                      ? "badge badge-success"
                                      : "badge badge-neutral"
                                  }
                                >
                                  {isCurrentCohabitant
                                    ? "Compañero actual"
                                    : "Compañero histórico"}
                                </span>
                                <span className="badge badge-info">
                                  {intervalLabel}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                                  <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                                    Limpieza
                                  </p>
                                  <p className="mt-2 text-lg font-bold text-ui-text">
                                    {vote.limpieza ?? "—"}
                                  </p>
                                </div>

                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                                  <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">
                                    Ruido
                                  </p>
                                  <p className="mt-2 text-lg font-bold text-ui-text">
                                    {vote.ruido ?? "—"}
                                  </p>
                                </div>

                                <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-center">
                                  <p className="text-[11px] font-medium uppercase tracking-wide text-sky-700">
                                    Pagos
                                  </p>
                                  <p className="mt-2 text-lg font-bold text-ui-text">
                                    {vote.puntualidad_pagos ?? "—"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1 text-xs text-ui-text-secondary">
                                <span>
                                  Voto emitido: {formatDateTime(vote.updated_at || vote.created_at)}
                                </span>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </section>

      <Modal
        open={Boolean(selectedPhoto.url)}
        title="Foto de perfil"
        onClose={closePhotoModal}
        size="default"
        closeLabel="Cerrar"
      >
        {selectedPhoto.url ? (
          <div className="space-y-4">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.alt}
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
