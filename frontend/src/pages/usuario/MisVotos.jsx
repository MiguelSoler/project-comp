import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Modal from "../../components/ui/Modal.jsx";
import ResponsiveDisclosureCard from "../../components/ui/ResponsiveDisclosureCard.jsx";
import { listMyVotes } from "../../services/votoUsuarioAuthService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function buildImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
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

function SummaryCard({ label, value, tone = "default", description }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-300 bg-emerald-50"
      : tone === "sky"
        ? "border-sky-300 bg-sky-50"
        : tone === "violet"
          ? "border-violet-300 bg-violet-50"
          : "border-amber-300 bg-amber-50";

  return (
    <div
      className={`group relative rounded-2xl border ${toneClass}`}
      tabIndex={description ? 0 : undefined}
      aria-label={description ? `${label}: ${description}` : undefined}
    >
      <div className="p-3 sm:p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold text-ui-text">
          {value}
        </p>
      </div>

      {description ? (
        <div className="pointer-events-none absolute inset-x-0 top-full z-20 mt-2 hidden rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-ui-text-secondary shadow-modal group-hover:block group-focus:block">
          {description}
        </div>
      ) : null}
    </div>
  );
}

export default function MisVotos() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState("newest");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState({ url: "", alt: "" });
  const [openVoteId, setOpenVoteId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadVotes() {
      try {
        setLoading(true);
        setError("");

        const data = await listMyVotes({ page, limit, sort });

        if (!isMounted) return;

        setItems(Array.isArray(data?.items) ? data.items : []);
        setOpenVoteId(null);
        setTotalPages(Number(data?.totalPages || 1));
        setTotal(Number(data?.total || 0));
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudieron cargar tus votos.");
        setItems([]);
        setTotalPages(1);
        setTotal(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadVotes();

    return () => {
      isMounted = false;
    };
  }, [page, limit, sort]);

  useEffect(() => {
    setPage(1);
  }, [sort]);

  function openPhotoModal(url, alt) {
    if (!url) return;
    setSelectedPhoto({ url, alt });
    setIsPhotoModalOpen(true);
  }

  function closePhotoModal() {
    setIsPhotoModalOpen(false);
    setSelectedPhoto({ url: "", alt: "" });
  }

  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const editableCount = items.filter((item) => Boolean(item.can_edit)).length;
  const closedCount = items.filter((item) => !item.can_edit).length;

  if (loading) {
    return (
      <section className="section">
        <div className="app-container">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="card">
              <div className="card-body space-y-4">
                <div className="skeleton h-10 w-56" />
                <div className="skeleton h-28 w-full" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="skeleton h-24 w-full rounded-2xl" />
                  <div className="skeleton h-24 w-full rounded-2xl" />
                  <div className="skeleton h-24 w-full rounded-2xl" />
                  <div className="skeleton h-24 w-full rounded-2xl" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body space-y-4">
                <div className="skeleton h-32 w-full rounded-2xl" />
                <div className="skeleton h-32 w-full rounded-2xl" />
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
                      Mis votos
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-ui-text-secondary">
                      Revisa tus votos emitidos y gestiona únicamente los que siguen
                      abiertos por convivencia actual.
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

            {!error ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <SummaryCard
                  label="Total emitidos"
                  value={total}
                  tone="violet"
                  description="Número total de votos que has emitido en toda tu actividad."
                />
                <SummaryCard
                  label="En esta página"
                  value={items.length}
                  tone="sky"
                  description="Votos que se están mostrando ahora mismo en esta página."
                />
                <SummaryCard
                  label="Editables"
                  value={editableCount}
                  tone="emerald"
                  description="Votos que todavía puedes modificar porque seguís conviviendo actualmente."
                />
                <SummaryCard
                  label="Cerrados"
                  value={closedCount}
                  tone="default"
                  description="Votos históricos que ya no se pueden editar."
                />
              </div>
            ) : null}

            <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 shadow-sm">
              <div className="card-body space-y-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="inline-flex rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                      Filtros
                    </div>

                    <h2 className="mt-3 text-xl font-bold tracking-tight text-ui-text">
                      Ordenación de votos
                    </h2>

                    <p className="mt-1 text-sm text-ui-text-secondary">
                      Cambia el orden para revisar antes tus votos más recientes o los
                      más antiguos.
                    </p>
                  </div>

                  <div className="w-full md:w-[260px]">
                    <label className="label" htmlFor="sort">
                      Ordenar por
                    </label>
                    <select
                      id="sort"
                      name="sort"
                      className="select"
                      value={sort}
                      onChange={(event) => setSort(event.target.value)}
                    >
                      <option value="newest">Más recientes</option>
                      <option value="oldest">Más antiguos</option>
                    </select>
                  </div>
                </div>

                <p className="text-xs text-ui-text-secondary">
                  Página <span className="font-medium text-ui-text">{page}</span> de{" "}
                  <span className="font-medium text-ui-text">{totalPages}</span> ·
                  Total histórico:{" "}
                  <span className="font-medium text-ui-text">{total}</span>
                </p>
              </div>
            </div>

            {error ? <div className="alert-error">{error}</div> : null}

            {!error && items.length === 0 ? (
              <div className="rounded-3xl border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-sm">
                <div className="card-body space-y-3">
                  <div className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Sin votos
                  </div>

                  <h2 className="text-lg font-semibold text-ui-text">
                    Todavía no has emitido ningún voto
                  </h2>

                  <p className="text-sm text-ui-text-secondary">
                    Cuando valores a tus convivientes, tus votos aparecerán aquí.
                  </p>
                </div>
              </div>
            ) : null}

            {items.length > 0 ? (
              <>
                <div className="space-y-4">
                  {items.map((item) => {
                    const nombreCompleto = [item.votado?.nombre, item.votado?.apellidos]
                      .filter(Boolean)
                      .join(" ");

                    const avatarUrl = buildImageUrl(item.votado?.foto_perfil_url);
                    const canEdit = Boolean(item.can_edit);

                    return (
                      <ResponsiveDisclosureCard
                        key={item.id}
                        id={`mis-votos-${item.id}`}
                        open={openVoteId === item.id}
                        onToggle={() =>
                          setOpenVoteId((prev) => (prev === item.id ? null : item.id))
                        }
                        accentClassName={canEdit ? "bg-emerald-500" : "bg-slate-400"}
                        summary={
                          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                            <div className="shrink-0">
                              {avatarUrl ? (
                                <button
                                  type="button"
                                  className="block rounded-full"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openPhotoModal(avatarUrl, nombreCompleto || "Usuario");
                                  }}
                                  aria-label="Ver foto de perfil"
                                >
                                  <img
                                    src={avatarUrl}
                                    alt={nombreCompleto || "Conviviente"}
                                    className="h-14 w-14 rounded-full border border-ui-border object-cover sm:h-16 sm:w-16"
                                  />
                                </button>
                              ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-ui-border bg-slate-100 text-sm font-semibold text-ui-text-secondary sm:h-16 sm:w-16">
                                  {getInitials(item.votado)}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <h2 className="truncate text-base font-semibold text-ui-text sm:text-lg">
                                {nombreCompleto || "Sin nombre"}
                              </h2>
                              <p className="truncate text-sm text-ui-text-secondary">
                                {item.piso?.ciudad || "â€”"}
                                {item.piso?.direccion ? ` Â· ${item.piso.direccion}` : ""}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={canEdit ? "badge badge-success" : "badge badge-neutral"}>
                                  {canEdit ? "Editable" : "Cerrado"}
                                </span>
                                <span className="badge badge-info">
                                  {item.limpieza}/{item.ruido}/{item.puntualidad_pagos}
                                </span>
                              </div>
                            </div>
                          </div>
                        }
                      >
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <div className="hidden">

                              {item.can_view_profile ? (
                                <Link
                                  to={`/usuarios/${item.votado_id}`}
                                  className="group block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-primary hover:bg-blue-50/60 hover:shadow-md"
                                >
                                  <div>
                                    <h2 className="text-lg font-semibold text-ui-text group-hover:text-brand-primary">
                                      {nombreCompleto || "Sin nombre"}
                                    </h2>
                                    <p className="text-sm text-ui-text-secondary">
                                      {item.piso?.ciudad || "—"}
                                      {item.piso?.direccion ? ` · ${item.piso.direccion}` : ""}
                                    </p>
                                  </div>
                                </Link>
                              ) : (
                                <div className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                  <div>
                                    <h2 className="text-lg font-semibold text-ui-text">
                                      {nombreCompleto || "Sin nombre"}
                                    </h2>
                                    <p className="text-sm text-ui-text-secondary">
                                      {item.piso?.ciudad || "—"}
                                      {item.piso?.direccion ? ` · ${item.piso.direccion}` : ""}
                                    </p>
                                    <p className="mt-2 text-xs text-ui-text-secondary">
                                      La reputación actual de este usuario ya no está disponible para ti.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {item.can_view_profile ? (
                              <Link
                                to={`/usuarios/${item.votado_id}`}
                                className="btn btn-secondary btn-sm"
                              >
                                Ver perfil
                              </Link>
                            ) : null}

                            <div className="flex flex-wrap items-center gap-2">
                              {canEdit ? (
                                <Link
                                  to={`/convivientes/${item.votado_id}/votar`}
                                  className="btn btn-primary btn-sm"
                                >
                                  Editar voto
                                </Link>
                              ) : (
                                <span className="badge badge-neutral">
                                  Voto cerrado
                                </span>
                              )}
                            </div>
                          </div>

                          {!canEdit ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-sm text-ui-text-secondary">
                                Ya no convivís actualmente en este piso, así que este voto se mantiene
                                como histórico y no puede editarse.
                              </p>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                              <p className="text-sm text-emerald-800">
                                Seguís conviviendo actualmente en este piso, por lo que todavía
                                puedes editar este voto.
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                                Limpieza
                              </p>
                              <p className="mt-1 text-lg font-semibold text-ui-text">
                                {item.limpieza}/5
                              </p>
                            </div>

                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                                Ruido
                              </p>
                              <p className="mt-1 text-lg font-semibold text-ui-text">
                                {item.ruido}/5
                              </p>
                            </div>

                            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                                Pagos
                              </p>
                              <p className="mt-1 text-lg font-semibold text-ui-text">
                                {item.puntualidad_pagos}/5
                              </p>
                            </div>

                            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                              <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                                Cambios
                              </p>
                              <p className="mt-1 text-lg font-semibold text-ui-text">
                                {item.num_cambios}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 text-xs text-ui-text-secondary md:flex-row md:items-center md:justify-between">
                            <span>
                              Creado: {formatDateTime(item.created_at)}
                            </span>

                            <span>
                              Última actualización: {formatDateTime(item.updated_at)}
                            </span>
                          </div>
                      </ResponsiveDisclosureCard>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={!hasPrev}
                    onClick={() => setPage((prev) => prev - 1)}
                  >
                    Anterior
                  </button>

                  <p className="text-xs text-ui-text-secondary">
                    Página <span className="font-medium text-ui-text">{page}</span> de{" "}
                    <span className="font-medium text-ui-text">{totalPages}</span>
                  </p>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={!hasNext}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Siguiente
                  </button>
                </div>
              </>
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
        {selectedPhoto.url ? (
          <div className="space-y-4">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.alt || "Foto de perfil"}
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
