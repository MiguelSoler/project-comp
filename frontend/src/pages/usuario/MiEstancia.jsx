import { useEffect, useMemo, useState } from "react";
import { getMyStay } from "../../services/usuarioService.js";
import { useNavigate } from "react-router-dom";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
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
    minute: "2-digit"
  }).format(date);
}

function getStayStateLabel(state) {
  if (state === "active") return "Activa";
  if (state === "left") return "Finalizada";
  if (state === "kicked") return "Expulsado";
  return "—";
}

function getStayStateBadgeClass(state) {
  if (state === "active") return "badge badge-success";
  if (state === "left") return "badge badge-neutral";
  if (state === "kicked") return "badge badge-warning";
  return "badge badge-neutral";
}

function getStayToneClasses(state) {
  if (state === "active") {
    return {
      wrapper: "border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50",
      accent: "bg-emerald-500",
      softBox: "border-emerald-200 bg-emerald-50",
      title: "text-emerald-800"
    };
  }

  if (state === "kicked") {
    return {
      wrapper: "border-rose-300 bg-gradient-to-br from-rose-50 via-white to-orange-50",
      accent: "bg-rose-500",
      softBox: "border-rose-200 bg-rose-50",
      title: "text-rose-800"
    };
  }

  return {
    wrapper: "border-slate-300 bg-gradient-to-br from-slate-50 via-white to-blue-50",
    accent: "bg-slate-400",
    softBox: "border-slate-200 bg-slate-50",
    title: "text-slate-800"
  };
}

function getDurationLabel(startValue, endValue = null) {
  if (!startValue) return "—";

  const start = new Date(startValue);
  const end = endValue ? new Date(endValue) : new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";

  const diffMs = Math.max(0, end.getTime() - start.getTime());
  const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  if (days === 1) return "1 día";
  if (days < 30) return `${days} días`;

  const months = Math.floor(days / 30);
  if (months === 1) return "1 mes";
  return `${months} meses`;
}

function InfoBox({ label, value, tone = "default" }) {
  const toneClass =
    tone === "violet"
      ? "border-violet-200 bg-violet-50"
      : tone === "sky"
        ? "border-sky-200 bg-sky-50"
        : tone === "emerald"
          ? "border-emerald-200 bg-emerald-50"
          : tone === "amber"
            ? "border-amber-200 bg-amber-50"
            : "border-slate-200 bg-slate-50";

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-ui-text">
        {value}
      </p>
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

export default function MiEstancia() {
  const navigate = useNavigate();

  const [stay, setStay] = useState(null);
  const [historialEstancias, setHistorialEstancias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStay() {
      try {
        setLoading(true);
        setError("");

        const data = await getMyStay();

        if (!isMounted) return;

        setStay(data?.stay || null);
        setHistorialEstancias(
          Array.isArray(data?.historial_estancias) ? data.historial_estancias : []
        );
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudo cargar tu estancia.");
        setStay(null);
        setHistorialEstancias([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadStay();

    return () => {
      isMounted = false;
    };
  }, []);

  const historialCount = historialEstancias.length;
  const totalEstancias = historialCount + (stay ? 1 : 0);
  const currentDuration = useMemo(
    () => getDurationLabel(stay?.fecha_entrada, null),
    [stay]
  );

  if (loading) {
    return (
      <section className="section">
        <div className="app-container">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="card">
              <div className="card-body space-y-4">
                <div className="skeleton h-10 w-64" />
                <div className="skeleton h-28 w-full" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="skeleton h-24 w-full rounded-2xl" />
                  <div className="skeleton h-24 w-full rounded-2xl" />
                  <div className="skeleton h-24 w-full rounded-2xl" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body space-y-4">
                <div className="skeleton h-6 w-56" />
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
                    Mi estancia
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-ui-text-secondary">
                    Consulta tu habitación actual y revisa también el histórico de pisos
                    y habitaciones en las que has vivido.
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <SummaryCard
                label="Estancia actual"
                value={stay ? "Sí" : "No"}
                tone="emerald"
              />
              <SummaryCard
                label="Histórico"
                value={historialCount}
                tone="sky"
              />
              <SummaryCard
                label="Total estancias"
                value={totalEstancias}
                tone="violet"
              />
              <SummaryCard
                label="Tiempo actual"
                value={stay ? currentDuration : "—"}
                tone="default"
              />
            </div>
          ) : null}

          {!error && !stay ? (
            <div className="rounded-3xl border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-sm">
              <div className="card-body space-y-3">
                <div className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Sin estancia activa
                </div>

                <h2 className="text-lg font-semibold text-ui-text">
                  Ahora mismo no estás viviendo en ninguna habitación
                </h2>

                <p className="text-sm text-ui-text-secondary">
                  No pasa nada: más abajo puedes seguir consultando tu histórico de
                  estancias anteriores.
                </p>
              </div>
            </div>
          ) : null}

          {stay ? (
            <div
              className={`overflow-hidden rounded-3xl border shadow-sm ${
                getStayToneClasses(stay.estado).wrapper
              }`}
            >
              <div className={`h-2 w-full ${getStayToneClasses(stay.estado).accent}`} />

              <div className="card-body space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="inline-flex rounded-full border border-white/80 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ui-text-secondary">
                      Estancia actual
                    </div>

                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-ui-text">
                      {stay?.habitacion_titulo || "Habitación actual"}
                    </h2>

                    <p className="mt-2 text-sm text-ui-text-secondary">
                      {stay?.ciudad || "—"}
                      {stay?.direccion ? ` · ${stay.direccion}` : ""}
                    </p>
                  </div>

                  <span className={getStayStateBadgeClass(stay?.estado)}>
                    {getStayStateLabel(stay?.estado)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                    <h3 className={`text-base font-semibold ${getStayToneClasses(stay.estado).title}`}>
                      Datos de la habitación
                    </h3>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <InfoBox
                        label="ID de habitación"
                        value={stay?.habitacion_id ?? "—"}
                        tone="violet"
                      />
                      <InfoBox
                        label="Título"
                        value={stay?.habitacion_titulo || "—"}
                        tone="sky"
                      />
                      <InfoBox
                        label="Estado"
                        value={getStayStateLabel(stay?.estado)}
                        tone="emerald"
                      />
                      <InfoBox
                        label="Entrada"
                        value={formatDateTime(stay?.fecha_entrada)}
                        tone="amber"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/80 bg-white/80 p-4">
                    <h3 className={`text-base font-semibold ${getStayToneClasses(stay.estado).title}`}>
                      Datos del piso
                    </h3>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <InfoBox
                        label="ID de piso"
                        value={stay?.piso_id ?? "—"}
                        tone="violet"
                      />
                      <InfoBox
                        label="Ciudad"
                        value={stay?.ciudad || "—"}
                        tone="sky"
                      />
                      <div className="md:col-span-2">
                        <InfoBox
                          label="Dirección"
                          value={stay?.direccion || "—"}
                          tone="default"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`rounded-2xl border p-4 ${getStayToneClasses(stay.estado).softBox}`}>
                  <p className="text-sm text-ui-text-secondary">
                    Llevas en esta estancia{" "}
                    <span className="font-semibold text-ui-text">
                      {currentDuration}
                    </span>{" "}
                    desde el{" "}
                    <span className="font-semibold text-ui-text">
                      {formatDate(stay?.fecha_entrada)}
                    </span>.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50 shadow-sm">
            <div className="card-body space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="inline-flex rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                    Historial
                  </div>

                  <h2 className="mt-3 text-xl font-bold tracking-tight text-ui-text">
                    Histórico de estancias
                  </h2>

                  <p className="mt-1 text-sm text-ui-text-secondary">
                    Aquí puedes ver tus habitaciones y pisos anteriores.
                  </p>
                </div>

                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-ui-text-secondary">
                  Total: {historialEstancias.length}
                </span>
              </div>

              {historialEstancias.length === 0 ? (
                <div className="rounded-2xl border border-slate-300 bg-white">
                  <div className="card-body">
                    <p className="text-sm text-ui-text-secondary">
                      Todavía no tienes estancias anteriores registradas.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {historialEstancias.map((item) => {
                    const tone = getStayToneClasses(item.estado);

                    return (
                      <article
                        key={item.id}
                        className={`overflow-hidden rounded-2xl border shadow-sm ${tone.wrapper}`}
                      >
                        <div className={`h-1.5 w-full ${tone.accent}`} />

                        <div className="p-4 md:p-5">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="text-lg font-semibold text-ui-text">
                                {item.habitacion_titulo || `Habitación #${item.habitacion_id ?? "—"}`}
                              </p>
                              <p className="mt-1 text-sm text-ui-text-secondary">
                                {item.ciudad || "—"}
                                {item.direccion ? ` · ${item.direccion}` : ""}
                              </p>
                            </div>

                            <span className={getStayStateBadgeClass(item.estado)}>
                              {getStayStateLabel(item.estado)}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <InfoBox
                              label="Piso"
                              value={item.piso_id ?? "—"}
                              tone="violet"
                            />
                            <InfoBox
                              label="Habitación"
                              value={item.habitacion_id ?? "—"}
                              tone="sky"
                            />
                            <InfoBox
                              label="Entrada"
                              value={formatDate(item.fecha_entrada)}
                              tone="emerald"
                            />
                            <InfoBox
                              label="Salida"
                              value={item.fecha_salida ? formatDate(item.fecha_salida) : "Activa"}
                              tone="amber"
                            />
                            <InfoBox
                              label="Duración"
                              value={getDurationLabel(item.fecha_entrada, item.fecha_salida)}
                              tone="default"
                            />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}