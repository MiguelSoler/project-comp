import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import PageShell from "../../components/layout/PageShell.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { getHabitacionById } from "../../services/habitacionService.js";

function formatEur(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("es-ES").format(n) + " €";
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

function buildImageUrl(pathOrNull) {
  if (!pathOrNull) return null;
  if (pathOrNull.startsWith("http")) return pathOrNull;

  const base = import.meta.env.VITE_API_BASE_URL || "";
  return `${base}${pathOrNull}`;
}

function formatDisplayName(entity) {
  const nombre = entity?.nombre || "";
  const apellidos = entity?.apellidos || "";
  const fullName = `${nombre} ${apellidos}`.trim();

  if (fullName) return fullName;
  if (entity?.email) return entity.email;
  return "Usuario";
}

function getInitials(entity) {
  return formatDisplayName(entity)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getMetricVoteItems(reputacionActual, metricKey) {
  if (!reputacionActual?.detalle_votos) return [];
  const items = reputacionActual.detalle_votos[metricKey];
  return Array.isArray(items) ? items : [];
}

function Feature({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ui-border py-2 last:border-b-0">
      <span className="text-sm text-ui-text-secondary">{label}</span>
      <span className="text-sm font-medium text-ui-text">{value}</span>
    </div>
  );
}

function MetricCard({ title, value, tone = "neutral", strongBorder = false }) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : tone === "info"
          ? "border-sky-300 bg-sky-50 text-sky-700"
          : tone === "violet"
            ? strongBorder
              ? "border-fuchsia-400 bg-fuchsia-50 text-fuchsia-600 border-4"
              : "border-violet-300 bg-violet-50 text-violet-700"
            : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-xl p-4 ${toneClasses}`}>
      <p className="text-xs font-medium uppercase tracking-wide">{title}</p>
      <p className="mt-2 text-2xl font-bold text-ui-text">{value}</p>
    </div>
  );
}

function PersonAvatar({ entity, onOpen, sizeClassName = "h-14 w-14" }) {
  const imageUrl = buildImageUrl(entity?.foto_perfil_url);

  if (imageUrl) {
    return (
      <button
        type="button"
        className={`overflow-hidden rounded-full ${sizeClassName}`}
        onClick={() => onOpen(imageUrl, formatDisplayName(entity))}
        aria-label={`Abrir foto de ${formatDisplayName(entity)}`}
        title={formatDisplayName(entity)}
      >
        <img
          src={imageUrl}
          alt={formatDisplayName(entity)}
          className={`${sizeClassName} object-cover`}
        />
      </button>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-blue-100 font-semibold text-brand-primary ${sizeClassName}`}
      title={formatDisplayName(entity)}
    >
      {getInitials(entity)}
    </div>
  );
}

function MiniVoteList({ items = [], onOpen }) {
  if (!items.length) {
    return (
      <p className="mt-2 text-xs text-ui-text-secondary">
        Sin votos actuales.
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => {
        const voterName = formatDisplayName(item.votante);
        const voterPhoto = buildImageUrl(item.votante?.foto_perfil_url);

        return (
          <div
            key={`${item.voto_id}-${item.votante?.id}-${item.valor}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white px-2 py-1 shadow-sm"
            title={voterName}
          >
            {voterPhoto ? (
              <button
                type="button"
                className="overflow-hidden rounded-full"
                onClick={() => onOpen(voterPhoto, voterName)}
                aria-label={`Abrir foto de ${voterName}`}
                title={voterName}
              >
                <img
                  src={voterPhoto}
                  alt={voterName}
                  className="h-6 w-6 rounded-full object-cover"
                />
              </button>
            ) : (
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-ui-text-secondary"
                title={voterName}
              >
                {getInitials(item.votante)}
              </div>
            )}

            <span className="text-xs font-semibold text-ui-text">
              {item.valor}/5
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ConvivienteMetricPanel({
  title,
  value,
  tone = "neutral",
  items = [],
  onOpen,
}) {
  const toneClasses =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : tone === "info"
          ? "border-sky-200 bg-sky-50"
          : "border-slate-200 bg-slate-50";

  const labelClasses =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
        ? "text-amber-700"
        : tone === "info"
          ? "text-sky-700"
          : "text-slate-700";

  return (
    <div className={`rounded-lg border p-3 ${toneClasses}`}>
      <p className={`text-xs font-medium uppercase tracking-wide ${labelClasses}`}>
        {title}
      </p>

      <p className="mt-1 text-lg font-semibold text-ui-text">
        {value}
      </p>

      <MiniVoteList items={items} onOpen={onOpen} />
    </div>
  );
}

export default function HabitacionDetail() {
  const { habitacionId } = useParams();

  const [habitacion, setHabitacion] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [manager, setManager] = useState(null);
  const [convivenciaActual, setConvivenciaActual] = useState(null);
  const [ocupantesActuales, setOcupantesActuales] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(null);

  function openImage(url, label = "Foto") {
    if (!url) return;
    setActiveImage({ url, label });
    setIsModalOpen(true);
  }

  function closeImage() {
    setIsModalOpen(false);
    setActiveImage(null);
  }

  function scrollToConvivencia() {
    const section = document.getElementById("convivencia-actual-piso");
    if (!section) return;

    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMsg("");

      try {
        const res = await getHabitacionById(habitacionId);

        if (cancelled) return;

        setHabitacion(res?.habitacion || null);
        setFotos(Array.isArray(res?.fotos) ? res.fotos : []);
        setManager(res?.manager || null);
        setConvivenciaActual(res?.convivencia_actual || null);
        setOcupantesActuales(Array.isArray(res?.ocupantes_actuales) ? res.ocupantes_actuales : []);
      } catch (err) {
        if (cancelled) return;

        setErrorMsg(err?.error || err?.message || "No se pudo cargar la habitación.");
        setHabitacion(null);
        setFotos([]);
        setManager(null);
        setConvivenciaActual(null);
        setOcupantesActuales([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [habitacionId]);

  const isDisponible = useMemo(() => {
    if (!habitacion) return false;
    return Boolean(habitacion.disponible) && !Boolean(habitacion.ocupada);
  }, [habitacion]);

  const coverUrl = useMemo(() => {
    if (fotos.length > 0) return buildImageUrl(fotos[0]?.url);
    return null;
  }, [fotos]);

  const convivenciaMediaGlobal = formatMetric(convivenciaActual?.media_global);

  const convivenciaLimpieza = formatMetric(
    convivenciaActual?.medias?.limpieza ?? convivenciaActual?.media_limpieza
  );

  const convivenciaRuido = formatMetric(
    convivenciaActual?.medias?.ruido ?? convivenciaActual?.media_ruido
  );

  const convivenciaPagos = formatMetric(
    convivenciaActual?.medias?.puntualidad_pagos ??
      convivenciaActual?.media_puntualidad_pagos
  );

  const convivenciaConvivientesActuales = Number(
    convivenciaActual?.convivientes_actuales ?? 0
  );

  const convivenciaConvivientesConVotos = Number(
    convivenciaActual?.convivientes_con_votos ?? 0
  );

  const convivenciaTotalVotosActuales = Number(
    convivenciaActual?.total_votos_actuales ?? 0
  );

  return (
    <PageShell
      title={habitacion ? habitacion.titulo : "Habitación"}
      subtitle={
        habitacion
          ? `${habitacion.ciudad || ""}${habitacion.codigo_postal ? ` · ${habitacion.codigo_postal}` : ""}`
          : "Detalle"
      }
      variant="plain"
      actions={
        <Link className="btn btn-secondary btn-sm" to="/habitaciones">
          Volver
        </Link>
      }
    >
      {errorMsg ? (
        <div className="alert-error">
          {errorMsg}{" "}
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={() => window.location.reload()}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <div className="skeleton aspect-[4/3] w-full" />
              <div className="card">
                <div className="card-body space-y-3">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-4 w-2/3" />
                </div>
              </div>
            </div>

            <aside className="space-y-4 lg:col-span-4">
              <div className="card">
                <div className="card-body space-y-3">
                  <div className="skeleton h-6 w-1/2" />
                  <div className="skeleton h-4 w-full" />
                  <div className="skeleton h-4 w-full" />
                </div>
              </div>
            </aside>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="skeleton h-28 rounded-xl" />
              ))}
            </div>

            <div className="skeleton h-24 rounded-xl" />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="card">
                  <div className="card-body space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="skeleton h-16 w-16 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-5 w-1/2" />
                        <div className="skeleton h-4 w-1/3" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="skeleton h-32 rounded-lg" />
                      <div className="skeleton h-32 rounded-lg" />
                      <div className="skeleton h-32 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : !habitacion ? (
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-ui-text-secondary">
              No se encontró la habitación.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              {coverUrl ? (
                <img
                  className="aspect-[4/3] w-full cursor-zoom-in rounded-lg border border-ui-border object-cover"
                  src={coverUrl}
                  alt={habitacion.titulo}
                  loading="lazy"
                  onClick={() => openImage(coverUrl, habitacion.titulo || "Habitación")}
                />
              ) : (
                <div className="skeleton aspect-[4/3] w-full" />
              )}

              {fotos.length > 1 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {fotos.slice(0, 8).map((f) => {
                    const url = buildImageUrl(f.url);

                    return (
                      <button
                        key={f.id}
                        type="button"
                        className="cursor-zoom-in overflow-hidden rounded-md border border-ui-border"
                        onClick={() => openImage(url, `Foto ${f.orden + 1}`)}
                        aria-label={`Abrir foto ${f.orden + 1}`}
                      >
                        <img
                          className="aspect-[4/3] w-full object-cover"
                          src={url}
                          alt={`Foto ${f.orden + 1}`}
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div className="card">
                <div className="card-body space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold">Descripción</h3>

                    <span className={isDisponible ? "badge badge-success" : "badge badge-neutral"}>
                      {isDisponible ? "Disponible" : "No disponible"}
                    </span>
                  </div>

                  <p className="whitespace-pre-line text-sm text-ui-text-secondary">
                    {habitacion.descripcion || "Sin descripción."}
                  </p>

                  {habitacion.direccion ? (
                    <p className="text-sm text-ui-text-secondary">
                      <span className="font-medium text-ui-text">Dirección:</span>{" "}
                      {habitacion.direccion}
                    </p>
                  ) : null}
                </div>
              </div>

              {habitacion.piso_descripcion ? (
                <div className="card">
                  <div className="card-body space-y-2">
                    <h3 className="text-base font-semibold">Sobre el piso</h3>
                    <p className="whitespace-pre-line text-sm text-ui-text-secondary">
                      {habitacion.piso_descripcion}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="space-y-4 lg:col-span-4">
              <div className="card">
                <div className="card-body space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm text-ui-text-secondary">Precio</p>
                      <p className="text-2xl font-bold text-ui-text">
                        {formatEur(habitacion.precio_mensual)}
                      </p>
                      <p className="text-xs text-ui-text-secondary">al mes</p>
                    </div>

                    <span className={isDisponible ? "badge badge-success" : "badge badge-neutral"}>
                      {isDisponible ? "Disponible" : "Ocupada"}
                    </span>
                  </div>

                  <div className="border-t border-ui-border pt-2">
                    <Feature
                      label="Tamaño"
                      value={habitacion.tamano_m2 ? `${habitacion.tamano_m2} m²` : "—"}
                    />
                    <Feature label="Amueblada" value={habitacion.amueblada ? "Sí" : "No"} />
                    <Feature label="Baño" value={habitacion.bano ? "Sí" : "No"} />
                    <Feature label="Balcón" value={habitacion.balcon ? "Sí" : "No"} />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body space-y-4">
                  <div>
                    <h3 className="text-base font-semibold">Manager del piso</h3>
                    <p className="mt-1 text-sm text-ui-text-secondary">
                      Contacta con él para visitar la habitación y cerrar el alquiler.
                    </p>
                  </div>

                  {manager ? (
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                      <div className="flex items-center gap-3">
                        <PersonAvatar entity={manager} onOpen={openImage} />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ui-text">
                            {formatDisplayName(manager)}
                          </p>
                          <p className="mt-1 text-sm text-ui-text-secondary">
                            {manager.telefono || "Teléfono no disponible"}
                          </p>
                        </div>
                      </div>

                      {manager.telefono ? (
                        <a
                          href={`tel:${manager.telefono}`}
                          className="btn btn-primary mt-4 w-full"
                        >
                          Llamar al manager
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-300 bg-slate-50">
                      <div className="card-body">
                        <p className="text-sm text-ui-text-secondary">
                          No hay información pública del manager disponible.
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    className="btn w-full border border-amber-300 bg-amber-200 text-amber-800 hover:bg-amber-300 hover:text-amber-800"
                    type="button"
                    onClick={scrollToConvivencia}
                  >
                    Ver convivencia actual del piso
                  </button>
                </div>
              </div>
            </aside>
          </div>

          <section id="convivencia-actual-piso" className="space-y-6">
            <div>
              <h3 className="text-xl font-bold tracking-tight text-ui-text md:text-2xl">
                Convivencia actual del piso
              </h3>
              <p className="mt-1 text-sm text-ui-text-secondary">
                Aquí ves la reputación real de la convivencia actual del piso, sin mezclar votos históricos.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                title="Media global"
                value={convivenciaMediaGlobal}
                tone="violet"
                strongBorder
              />
              <MetricCard
                title="Limpieza media"
                value={convivenciaLimpieza}
                tone="success"
              />
              <MetricCard
                title="Ruido medio"
                value={convivenciaRuido}
                tone="warning"
              />
              <MetricCard
                title="Pagos medios"
                value={convivenciaPagos}
                tone="info"
              />
              <MetricCard
                title="Convivientes actuales"
                value={convivenciaConvivientesActuales}
                tone="violet"
              />
            </div>

            <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-ui-text">
                Resumen general visible del grupo
              </p>

              <div className="mt-3 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-4">
                <p className="text-sm text-ui-text-secondary">
                  Media global actual del piso:{" "}
                  <span className="font-semibold text-ui-text">
                    {convivenciaMediaGlobal}
                  </span>
                </p>

                <p className="text-sm text-ui-text-secondary">
                  Total votos actuales entre convivientes:{" "}
                  <span className="font-semibold text-ui-text">
                    {convivenciaTotalVotosActuales}
                  </span>
                </p>

                <p className="text-sm text-ui-text-secondary">
                  Convivientes con votos:{" "}
                  <span className="font-semibold text-ui-text">
                    {convivenciaConvivientesConVotos}
                  </span>
                </p>
              </div>
            </div>

            {ocupantesActuales.length === 0 ? (
              <div className="card">
                <div className="card-body">
                  <p className="text-sm text-ui-text-secondary">
                    Este piso no tiene convivientes activos en este momento.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {ocupantesActuales.map((ocupante) => {
                  const reputacionActual = ocupante.reputacion_actual || null;

                  const limpiezaVotes = getMetricVoteItems(
                    reputacionActual,
                    "limpieza"
                  );

                  const ruidoVotes = getMetricVoteItems(
                    reputacionActual,
                    "ruido"
                  );

                  const pagosVotes = getMetricVoteItems(
                    reputacionActual,
                    "puntualidad_pagos"
                  );

                  return (
                    <article
                      key={ocupante.id}
                      className="card"
                    >
                      <div className="card-body space-y-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex items-center gap-4">
                            <PersonAvatar
                              entity={ocupante}
                              onOpen={openImage}
                              sizeClassName="h-16 w-16"
                            />

                            <div className="min-w-0">
                              <p className="text-lg font-semibold text-ui-text">
                                {formatDisplayName(ocupante)}
                              </p>

                              <p className="mt-1 text-sm text-ui-text-secondary">
                                Habitación #{ocupante.habitacion_id}
                                {ocupante.habitacion_titulo
                                  ? ` · ${ocupante.habitacion_titulo}`
                                  : ""}
                              </p>

                              <p className="mt-1 text-xs text-ui-text-secondary">
                                Entrada: {formatDate(ocupante.fecha_entrada)}
                              </p>
                            </div>
                          </div>

                          <span className="badge badge-info">
                            Total votos: {Number(reputacionActual?.total_votos ?? ocupante.total_votos ?? 0)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <ConvivienteMetricPanel
                            title="Limpieza"
                            value={formatMetric(
                              reputacionActual?.medias?.limpieza ?? ocupante.media_limpieza
                            )}
                            tone="success"
                            items={limpiezaVotes}
                            onOpen={openImage}
                          />

                          <ConvivienteMetricPanel
                            title="Ruido"
                            value={formatMetric(
                              reputacionActual?.medias?.ruido ?? ocupante.media_ruido
                            )}
                            tone="warning"
                            items={ruidoVotes}
                            onOpen={openImage}
                          />

                          <ConvivienteMetricPanel
                            title="Puntualid. pagos"
                            value={formatMetric(
                              reputacionActual?.medias?.puntualidad_pagos ??
                                ocupante.media_puntualidad_pagos
                            )}
                            tone="info"
                            items={pagosVotes}
                            onOpen={openImage}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      <Modal
        open={isModalOpen}
        title={activeImage?.label || "Foto"}
        onClose={closeImage}
      >
        {activeImage ? (
          <img
            className="max-h-[75vh] w-full rounded-md object-contain"
            src={activeImage.url}
            alt={activeImage.label || "Foto ampliada"}
          />
        ) : null}
      </Modal>
    </PageShell>
  );
}