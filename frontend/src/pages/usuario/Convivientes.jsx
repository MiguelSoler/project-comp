import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

export default function Convivientes() {
  const [stay, setStay] = useState(null);
  const [convivientes, setConvivientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const stayData = await getMyStay();
        const estancia = stayData?.estancia || null;

        if (!isMounted) return;

        setStay(estancia);

        const pisoId = estancia?.piso?.id;
        if (!pisoId) {
          setConvivientes([]);
          return;
        }

        const convivientesData = await listConvivientesByPiso(pisoId);

        if (!isMounted) return;
        setConvivientes(Array.isArray(convivientesData?.convivientes) ? convivientesData.convivientes : []);
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudieron cargar los convivientes.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="section">
        <div className="app-container">
          <div className="card">
            <div className="card-body space-y-4">
              <div className="skeleton h-8 w-56" />
              <div className="skeleton h-20 w-full" />
              <div className="skeleton h-20 w-full" />
              <div className="skeleton h-20 w-full" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="app-container">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="space-y-2">
            <h1>Mis convivientes</h1>
            <p className="text-sm text-ui-text-secondary">
              Personas que conviven actualmente contigo en el piso.
            </p>
          </header>

          {error ? <div className="alert-error">{error}</div> : null}

          {!error && !stay ? (
            <div className="card">
              <div className="card-body">
                <p className="text-ui-text-secondary">
                  No tienes una estancia activa, así que no podemos mostrar convivientes.
                </p>
              </div>
            </div>
          ) : null}

          {!error && stay && convivientes.length === 0 ? (
            <div className="card">
              <div className="card-body">
                <p className="text-ui-text-secondary">
                  No hay convivientes activos en este piso ahora mismo.
                </p>
              </div>
            </div>
          ) : null}

          {stay && convivientes.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {convivientes.map((conviviente) => {
                const nombreCompleto = [conviviente.nombre, conviviente.apellidos]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <article key={conviviente.usuario_habitacion_id} className="card">
                    <div className="card-body space-y-4">
                      <div className="flex items-start gap-4">
                        {conviviente.foto_perfil_url ? (
                          <img
                            src={buildImageUrl(conviviente.foto_perfil_url)}
                            alt={nombreCompleto || "Conviviente"}
                            className="h-16 w-16 rounded-full border border-ui-border object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-ui-border bg-slate-100 text-sm font-semibold text-ui-text-secondary">
                            {conviviente.nombre?.slice(0, 1)?.toUpperCase() || "?"}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold text-ui-text">
                            {nombreCompleto || "Sin nombre"}
                          </h2>
                          <p className="text-sm text-ui-text-secondary">
                            Habitación #{conviviente.habitacion_id}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                          Fecha de entrada
                        </p>
                        <p className="mt-1">
                          {conviviente.fecha_entrada
                            ? new Date(conviviente.fecha_entrada).toLocaleDateString("es-ES")
                            : "—"}
                        </p>
                      </div>
                      <div className="flex items-center justify-end">
                        <Link
                          to={`/convivientes/${conviviente.id}/votar`}
                          className="btn btn-primary btn-sm"
                        >
                          Votar
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}