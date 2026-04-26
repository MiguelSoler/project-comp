import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MetricSummaryCard from "../../components/ui/MetricSummaryCard.jsx";
import Modal from "../../components/ui/Modal.jsx";
import ResponsiveDisclosureCard from "../../components/ui/ResponsiveDisclosureCard.jsx";
import { getMyStay } from "../../services/usuarioService.js";
import { leaveHabitacion } from "../../services/usuarioHabitacionService.js";

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

function getLeaveStayErrorMessage(error) {
  const code = error?.error || error?.message;

  switch (code) {
    case "NO_ACTIVE_STAY":
      return "Ahora mismo no tienes ninguna estancia activa que abandonar.";
    case "INVALID_TOKEN":
    case "MISSING_OR_INVALID_TOKEN":
      return "Tu sesión ya no es válida. Vuelve a iniciar sesión.";
    case "USER_INACTIVE":
      return "Tu cuenta está inactiva y no puede realizar esta acción.";
    case "INTERNAL_ERROR":
      return "No se pudo abandonar la habitación por un problema interno. Inténtalo de nuevo.";
    default:
      return "No se pudo abandonar la habitación. Inténtalo de nuevo.";
  }
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

export default function MiEstancia() {
  const navigate = useNavigate();

  const [stay, setStay] = useState(null);
  const [historialEstancias, setHistorialEstancias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leavingStay, setLeavingStay] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [openSection, setOpenSection] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStay() {
      try {
        setLoading(true);
        setError("");
        setSuccessMsg("");

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

  function openLeaveModal() {
    if (!stay || stay.estado !== "active") return;
    setIsLeaveModalOpen(true);
  }

  function closeLeaveModal() {
    if (leavingStay) return;
    setIsLeaveModalOpen(false);
  }

  async function handleConfirmLeaveStay() {
    if (!stay) return;

    try {
      setLeavingStay(true);
      setError("");
      setSuccessMsg("");

      const currentStay = stay;
      const data = await leaveHabitacion({});
      const closedStay = data?.stay || null;

      const historialItem = {
        id: currentStay.id,
        usuario_id: currentStay.usuario_id,
        habitacion_id: currentStay.habitacion_id,
        habitacion_titulo: currentStay.habitacion_titulo,
        piso_id: currentStay.piso_id,
        ciudad: currentStay.ciudad,
        direccion: currentStay.direccion,
        fecha_entrada: currentStay.fecha_entrada,
        fecha_salida: closedStay?.fecha_salida || new Date().toISOString(),
        estado: closedStay?.estado || "left"
      };

      setHistorialEstancias((prev) => [historialItem, ...prev]);
      setStay(null);
      setIsLeaveModalOpen(false);
      setSuccessMsg("Has abandonado la habitación correctamente.");
    } catch (err) {
      setError(getLeaveStayErrorMessage(err));
      setIsLeaveModalOpen(false);
    } finally {
      setLeavingStay(false);
    }
  }

  if (loading) {
    return (
      <section className="section">
        <div className="app-container">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="card">
              <div className="card-body space-y-4">
                <div className="skeleton h-10 w-64" />
                <div className="skeleton h-28 w-full" />
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <div className="skeleton h-24 w-full rounded-2xl" />
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
            {successMsg ? <div className="alert-success">{successMsg}</div> : null}

            {!error ? (
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
                <MetricSummaryCard
                  label="Estancia actual"
                  value={stay ? "Sí" : "No"}
                  tone="emerald"
                  bodyClassName="p-2 sm:p-4"
                  labelClassName="text-[10px] font-medium uppercase leading-tight tracking-wide text-ui-text-secondary sm:text-xs"
                  valueClassName="mt-1 text-lg font-bold text-ui-text sm:mt-2 sm:text-2xl"
                  description="Indica si tienes una estancia activa en este momento."
                />
                <MetricSummaryCard
                  label="Histórico"
                  value={historialCount}
                  tone="sky"
                  bodyClassName="p-2 sm:p-4"
                  labelClassName="text-[10px] font-medium uppercase leading-tight tracking-wide text-ui-text-secondary sm:text-xs"
                  valueClassName="mt-1 text-lg font-bold text-ui-text sm:mt-2 sm:text-2xl"
                  description="Número de estancias anteriores registradas en tu historial."
                />
                <MetricSummaryCard
                  label="Total estancias"
                  value={totalEstancias}
                  tone="violet"
                  bodyClassName="p-2 sm:p-4"
                  labelClassName="text-[10px] font-medium uppercase leading-tight tracking-wide text-ui-text-secondary sm:text-xs"
                  valueClassName="mt-1 text-lg font-bold text-ui-text sm:mt-2 sm:text-2xl"
                  description="Suma de tu estancia activa, si existe, y todas tus estancias históricas."
                />
                <MetricSummaryCard
                  label="Tiempo actual"
                  value={stay ? currentDuration : "—"}
                  tone="default"
                  bodyClassName="p-2 sm:p-4"
                  labelClassName="text-[10px] font-medium uppercase leading-tight tracking-wide text-ui-text-secondary sm:text-xs"
                  valueClassName="mt-1 text-lg font-bold text-ui-text sm:mt-2 sm:text-2xl"
                  description="Tiempo aproximado que llevas en tu estancia activa actual."
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
              <ResponsiveDisclosureCard
                id="mi-estancia-actual"
                open={openSection === "actual"}
                onToggle={() =>
                  setOpenSection((prev) => (prev === "actual" ? "" : "actual"))
                }
                accentClassName={getStayToneClasses(stay.estado).accent}
                className={getStayToneClasses(stay.estado).wrapper}
                summary={
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
                }
              >
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
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

                      {stay?.estado === "active" ? (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={openLeaveModal}
                        >
                          Abandonar habitación
                        </button>
                      ) : null}
                    </div>
                  </div>
              </ResponsiveDisclosureCard>
            ) : null}

            <ResponsiveDisclosureCard
              id="mi-estancia-historial"
              open={openSection === "historial"}
              onToggle={() =>
                setOpenSection((prev) => (prev === "historial" ? "" : "historial"))
              }
              accentClassName="bg-violet-500"
              className="border-violet-200 bg-gradient-to-br from-violet-50 via-white to-sky-50"
              summary={
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
              }
            >
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
            </ResponsiveDisclosureCard>
          </div>
        </div>
      </section>

      <Modal
        open={isLeaveModalOpen}
        title="Confirmar abandono de la habitación"
        onClose={closeLeaveModal}
        size="md"
        tone="danger"
        closeLabel="Cancelar"
        closeOnOverlay={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-ui-text-secondary">
            Vas a abandonar tu habitación actual. Tu estancia activa se cerrará y
            dejarás de figurar como ocupante de esta habitación.
          </p>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              {stay?.habitacion_titulo || "Habitación actual"}
            </p>
            <p className="mt-1 text-sm text-red-700">
              {stay?.ciudad || "—"}
              {stay?.direccion ? ` · ${stay.direccion}` : ""}
            </p>
            <p className="mt-1 text-sm text-red-700">
              Entrada: {formatDateTime(stay?.fecha_entrada)}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeLeaveModal}
              disabled={leavingStay}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleConfirmLeaveStay}
              disabled={leavingStay}
            >
              {leavingStay ? "Abandonando..." : "Sí, abandonar"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
