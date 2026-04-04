import { useEffect, useState } from "react";
import { getMyStay } from "../../services/usuarioService.js";
import { useNavigate } from "react-router-dom";

export default function MiEstancia() {
  const navigate = useNavigate();
  const [stay, setStay] = useState(null);
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
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudo cargar tu estancia.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadStay();

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
              <div className="skeleton h-24 w-full" />
              <div className="skeleton h-24 w-full" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="app-container">
        <div className="mx-auto max-w-3xl space-y-6">
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
          
            <div>
              <h1>Mi estancia</h1>
              <p className="text-sm text-ui-text-secondary">
                Consulta tu habitación actual y los datos del piso donde convives.
              </p>
            </div>
          </header>

          {error ? <div className="alert-error">{error}</div> : null}

          {!error && !stay ? (
            <div className="card">
              <div className="card-body">
                <p className="text-ui-text-secondary">
                  Ahora mismo no tienes ninguna estancia activa.
                </p>
              </div>
            </div>
          ) : null}

          {stay ? (
            <>
              <div className="card">
                <div className="card-body space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Habitación</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                        ID de habitación
                      </p>
                      <p className="mt-1">{stay?.habitacion_id ?? "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                        Título
                      </p>
                      <p className="mt-1">{stay?.habitacion_titulo || "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                        Estado de estancia
                      </p>
                      <p className="mt-1">{stay?.estado || "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                        Fecha de entrada
                      </p>
                      <p className="mt-1">
                        {stay?.fecha_entrada
                          ? new Date(stay.fecha_entrada).toLocaleDateString("es-ES")
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Piso</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                        ID de piso
                      </p>
                      <p className="mt-1">{stay?.piso_id ?? "—"}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                        Ciudad
                      </p>
                      <p className="mt-1">{stay?.ciudad || "—"}</p>
                    </div>

                    <div className="md:col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                        Dirección
                      </p>
                      <p className="mt-1">{stay?.direccion || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}