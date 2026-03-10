import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import {
  getAdminPisoById,
  listAdminHabitacionesByPiso,
} from "../../services/adminPisoService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function buildImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function formatEur(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${new Intl.NumberFormat("es-ES").format(n)} €`;
}

export default function PisoManagerDetail() {
  const { pisoId } = useParams();

  const [piso, setPiso] = useState(null);
  const [habitaciones, setHabitaciones] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [pisoData, habitacionesData] = await Promise.all([
          getAdminPisoById(pisoId),
          listAdminHabitacionesByPiso(pisoId),
        ]);

        if (!isMounted) return;

        setPiso(pisoData?.piso || null);
        setHabitaciones(Array.isArray(habitacionesData?.items) ? habitacionesData.items : []);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudo cargar el detalle del piso.");
        setPiso(null);
        setHabitaciones([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [pisoId]);

  const cover = buildImageUrl(piso?.cover_foto_piso_url);

  return (
    <PageShell
      title="Detalle del piso"
      subtitle="Consulta información del piso y sus habitaciones."
      variant="plain"
      contentClassName="space-y-6"
      actions={
        <Link to="/manager" className="btn btn-secondary btn-sm">
          Volver
        </Link>
      }
    >
      {error ? <div className="alert-error">{error}</div> : null}

      {loading ? (
        <div className="space-y-4">
          <div className="card">
            <div className="card-body space-y-4">
              <div className="skeleton aspect-[16/6] w-full" />
              <div className="skeleton h-6 w-1/3" />
              <div className="skeleton h-4 w-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="card">
                <div className="card-body space-y-3">
                  <div className="skeleton aspect-[4/3] w-full" />
                  <div className="skeleton h-5 w-2/3" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : piso ? (
        <>
          <div className="card">
            <div className="card-body space-y-4">
              {cover ? (
                <img
                  src={cover}
                  alt={piso.direccion || `Piso ${piso.id}`}
                  className="aspect-[16/6] w-full rounded-lg object-cover"
                />
              ) : (
                <div className="skeleton aspect-[16/6] w-full rounded-lg" />
              )}

              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-ui-text">
                    {piso.direccion || "Sin dirección"}
                  </h2>

                  <p className="text-sm text-ui-text-secondary">
                    {piso.ciudad || "—"}
                    {piso.codigo_postal ? ` · ${piso.codigo_postal}` : ""}
                  </p>
                </div>

                <span className={piso.activo ? "badge badge-success" : "badge badge-neutral"}>
                  {piso.activo ? "Activo" : "Inactivo"}
                </span>
              </div>

              <p className="text-sm text-ui-text-secondary">
                {piso.descripcion || "Sin descripción."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="card">
              <div className="card-body">
                <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                  Habitaciones totales
                </p>
                <p className="mt-2 text-2xl font-bold text-ui-text">
                  {piso.habitaciones_total ?? 0}
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                  Habitaciones activas
                </p>
                <p className="mt-2 text-2xl font-bold text-ui-text">
                  {piso.habitaciones_activas ?? 0}
                </p>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                  Habitaciones disponibles
                </p>
                <p className="mt-2 text-2xl font-bold text-ui-text">
                  {piso.habitaciones_disponibles ?? 0}
                </p>
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-ui-text">Habitaciones del piso</h3>
              <span className="text-xs text-ui-text-secondary">
                Total cargadas: {habitaciones.length}
              </span>
            </div>

            {habitaciones.length === 0 ? (
              <div className="card">
                <div className="card-body">
                  <p className="text-sm text-ui-text-secondary">
                    Este piso todavía no tiene habitaciones.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {habitaciones.map((habitacion) => {
                  const roomCover = buildImageUrl(habitacion.cover_foto_habitacion_url);

                  return (
                    <article key={habitacion.id} className="card">
                      <div className="card-body space-y-3">
                        {roomCover ? (
                          <img
                            src={roomCover}
                            alt={habitacion.titulo || `Habitación ${habitacion.id}`}
                            className="aspect-[4/3] w-full rounded-md object-cover"
                          />
                        ) : (
                          <div className="skeleton aspect-[4/3] w-full rounded-md" />
                        )}

                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-base font-semibold text-ui-text">
                            {habitacion.titulo || "Sin título"}
                          </h4>

                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <span
                              className={
                                habitacion.activo ? "badge badge-success" : "badge badge-neutral"
                              }
                            >
                              {habitacion.activo ? "Activa" : "Inactiva"}
                            </span>

                            <span
                              className={
                                habitacion.disponible
                                  ? "badge badge-info"
                                  : "badge badge-warning"
                              }
                            >
                              {habitacion.disponible ? "Disponible" : "No disponible"}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-ui-text-secondary">
                          <span className="font-medium text-ui-text">
                            {formatEur(habitacion.precio_mensual)}
                          </span>{" "}
                          / mes
                          {habitacion.tamano_m2 ? ` · ${habitacion.tamano_m2} m²` : ""}
                        </p>

                        <p className="text-xs text-ui-text-secondary">
                          {habitacion.amueblada ? "Amueblada · " : ""}
                          {habitacion.bano ? "Baño · " : ""}
                          {habitacion.balcon ? "Balcón" : ""}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}
    </PageShell>
  );
}