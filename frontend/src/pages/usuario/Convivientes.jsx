import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MetricSummaryCard from "../../components/ui/MetricSummaryCard.jsx";
import Modal from "../../components/ui/Modal.jsx";
import ResponsiveDisclosureCard from "../../components/ui/ResponsiveDisclosureCard.jsx";
import { getMyStay } from "../../services/usuarioService.js";
import { listConvivientesByPiso } from "../../services/usuarioHabitacionService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function buildImageUrl(url) {
  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
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

export default function Convivientes() {
  const navigate = useNavigate();
  const [stay, setStay] = useState(null);
  const [convivientes, setConvivientes] = useState([]);
  const [openConvivienteId, setOpenConvivienteId] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState({ url: "", alt: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const stayData = await getMyStay();
        const currentStay = stayData?.stay || null;

        if (!isMounted) return;

        setStay(currentStay);

        const pisoId = currentStay?.piso_id;
        if (!pisoId) {
          setConvivientes([]);
          return;
        }

        const convivientesData = await listConvivientesByPiso(pisoId);

        if (!isMounted) return;

        const items = Array.isArray(convivientesData?.convivientes)
          ? convivientesData.convivientes
          : [];

        setConvivientes(
          items.filter(
            (item) => Number(item?.usuario_habitacion_id) !== Number(currentStay?.id)
          )
        );
        setOpenConvivienteId(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudieron cargar los convivientes.");
        setConvivientes([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

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
                <div className="skeleton h-10 w-56" />
                <div className="skeleton h-28 w-full" />
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  <div className="skeleton h-24 w-full rounded-2xl" />
                  <div className="skeleton h-24 w-full rounded-2xl" />
                  <div className="skeleton h-24 w-full rounded-2xl" />
                  <div className="skeleton h-24 w-full rounded-2xl" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="skeleton h-52 w-full rounded-3xl" />
              <div className="skeleton h-52 w-full rounded-3xl" />
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
                    Mis convivientes
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-ui-text-secondary">
                    Personas que conviven actualmente contigo en el piso y a las
                    que puedes valorar mientras compartís estancia activa.
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
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
              <MetricSummaryCard
                label="Estancia activa"
                value={stay ? "Sí" : "No"}
                tone="emerald"
                bodyClassName="p-2 sm:p-4"
                labelClassName="text-[10px] font-medium uppercase leading-tight tracking-wide text-ui-text-secondary sm:text-xs"
                valueClassName="mt-1 text-lg font-bold text-ui-text sm:mt-2 sm:text-2xl"
                description="Indica si ahora mismo tienes una estancia activa asociada a una habitación."
              />
              <MetricSummaryCard
                label="Convivientes"
                value={convivientes.length}
                tone="sky"
                bodyClassName="p-2 sm:p-4"
                labelClassName="text-[10px] font-medium uppercase leading-tight tracking-wide text-ui-text-secondary sm:text-xs"
                valueClassName="mt-1 text-lg font-bold text-ui-text sm:mt-2 sm:text-2xl"
                description="Número de personas que conviven actualmente contigo en el mismo piso."
              />
              <MetricSummaryCard
                label="Piso actual"
                value={stay?.piso_id ?? "—"}
                tone="violet"
                bodyClassName="p-2 sm:p-4"
                labelClassName="text-[10px] font-medium uppercase leading-tight tracking-wide text-ui-text-secondary sm:text-xs"
                valueClassName="mt-1 text-lg font-bold text-ui-text sm:mt-2 sm:text-2xl"
                description="Identificador del piso en el que está registrada tu estancia actual."
              />
              <MetricSummaryCard
                label="Tu habitación"
                value={stay?.habitacion_id ?? "—"}
                tone="default"
                bodyClassName="p-2 sm:p-4"
                labelClassName="text-[10px] font-medium uppercase leading-tight tracking-wide text-ui-text-secondary sm:text-xs"
                valueClassName="mt-1 text-lg font-bold text-ui-text sm:mt-2 sm:text-2xl"
                description="Identificador de la habitación que tienes asignada en tu estancia actual."
              />
            </div>
          ) : null}

          {stay ? (
            <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-sm">
              <div className="card-body space-y-4">
                <div>
                  <div className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Piso actual
                  </div>

                  <h2 className="mt-3 text-xl font-bold tracking-tight text-ui-text">
                    Contexto de convivencia
                  </h2>

                  <p className="mt-1 text-sm text-ui-text-secondary">
                    {stay?.ciudad || "—"}
                    {stay?.direccion ? ` · ${stay.direccion}` : ""}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-800">
                    Estás en la habitación{" "}
                    <span className="font-semibold text-ui-text">
                      #{stay?.habitacion_id ?? "—"}
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

          {error ? <div className="alert-error">{error}</div> : null}

          {!error && !stay ? (
            <div className="rounded-3xl border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-sm">
              <div className="card-body space-y-3">
                <div className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Sin estancia activa
                </div>

                <h2 className="text-lg font-semibold text-ui-text">
                  No tienes una estancia activa
                </h2>

                <p className="text-sm text-ui-text-secondary">
                  Ahora mismo no podemos mostrar convivientes porque no estás
                  asociado a ningún piso activo.
                </p>
              </div>
            </div>
          ) : null}

          {!error && stay && convivientes.length === 0 ? (
            <div className="rounded-3xl border border-slate-300 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-sm">
              <div className="card-body space-y-3">
                <div className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Sin convivientes
                </div>

                <h2 className="text-lg font-semibold text-ui-text">
                  No hay convivientes activos en este piso
                </h2>

                <p className="text-sm text-ui-text-secondary">
                  En este momento no compartes piso con otras personas activas.
                </p>
              </div>
            </div>
          ) : null}

          {stay && convivientes.length > 0 ? (
            <div className="space-y-4">
              {convivientes.map((conviviente) => {
                const nombreCompleto = [conviviente.nombre, conviviente.apellidos]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <ResponsiveDisclosureCard
                    key={conviviente.usuario_habitacion_id}
                    id={`conviviente-${conviviente.usuario_habitacion_id}`}
                    open={openConvivienteId === conviviente.usuario_habitacion_id}
                    onToggle={() =>
                      setOpenConvivienteId((prev) =>
                        prev === conviviente.usuario_habitacion_id
                          ? null
                          : conviviente.usuario_habitacion_id
                      )
                    }
                    accentClassName="bg-emerald-500"
                    summary={
                      <div className="flex min-w-0 w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 sm:gap-4">
                        {conviviente.foto_perfil_url ? (
                          <button
                            type="button"
                            className="shrink-0"
                            onClick={(event) => {
                              event.stopPropagation();
                              openPhotoModal(
                                buildImageUrl(conviviente.foto_perfil_url),
                                nombreCompleto || "Conviviente"
                              );
                            }}
                            aria-label={`Ver foto de ${nombreCompleto || "conviviente"}`}
                          >
                            <img
                              src={buildImageUrl(conviviente.foto_perfil_url)}
                              alt={nombreCompleto || "Conviviente"}
                              className="h-14 w-14 rounded-full border border-ui-border object-cover sm:h-16 sm:w-16"
                            />
                          </button>
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-ui-border bg-slate-100 text-sm font-semibold text-ui-text-secondary sm:h-16 sm:w-16">
                            {getInitials(conviviente)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h2 className="truncate text-base font-semibold text-ui-text sm:text-lg">
                            {nombreCompleto || "Sin nombre"}
                          </h2>
                          <p className="truncate text-sm text-ui-text-secondary">
                            Habitación #{conviviente.habitacion_id}
                          </p>
                          <span className="mt-2 inline-flex badge badge-success">
                            Conviviente actual
                          </span>
                        </div>
                      </div>
                    }
                  >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Link
                          to={`/usuarios/${conviviente.id}`}
                          className="btn w-full border border-sky-300 bg-sky-100 text-sky-800 hover:bg-sky-200 hover:text-sky-900"
                        >
                          Ver reputación
                        </Link>

                        <Link
                          to={`/convivientes/${conviviente.id}/votar`}
                          className="btn btn-primary w-full"
                        >
                          Votar
                        </Link>
                      </div>


                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                            Fecha de entrada
                          </p>
                          <p className="mt-2 text-sm font-semibold text-ui-text">
                            {formatDate(conviviente.fecha_entrada)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                            Habitación
                          </p>
                          <p className="mt-2 text-sm font-semibold text-ui-text">
                            #{conviviente.habitacion_id}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                            Estado
                          </p>
                          <p className="mt-2 text-sm font-semibold text-ui-text">
                            Conviviente actual
                          </p>
                        </div>
                      </div>
                  </ResponsiveDisclosureCard>
                );
              })}
            </div>
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
