import { useEffect, useState } from "react";
import { getMyStay } from "../../services/usuarioService.js";

export default function MiEstancia() {
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
                setStay(data?.estancia || null);
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
                    <header className="space-y-2">
                        <h1>Mi estancia</h1>
                        <p className="text-sm text-ui-text-secondary">
                            Consulta tu habitación actual y los datos del piso donde convives.
                        </p>
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
                                                Título
                                            </p>
                                            <p className="mt-1">{stay?.habitacion?.titulo || "—"}</p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                                Precio mensual
                                            </p>
                                            <p className="mt-1">
                                                {stay?.habitacion?.precio_mensual != null
                                                    ? `${stay.habitacion.precio_mensual} €`
                                                    : "—"}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                                Tamaño
                                            </p>
                                            <p className="mt-1">
                                                {stay?.habitacion?.tamano_m2 != null
                                                    ? `${stay.habitacion.tamano_m2} m²`
                                                    : "—"}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                                Amueblada
                                            </p>
                                            <p className="mt-1">
                                                {stay?.habitacion?.amueblada ? "Sí" : "No"}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                                Disponible
                                            </p>
                                            <p className="mt-1">
                                                {stay?.habitacion?.disponible ? "Sí" : "No"}
                                            </p>
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
                                                Dirección
                                            </p>
                                            <p className="mt-1">{stay?.piso?.direccion || "—"}</p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                                Ciudad
                                            </p>
                                            <p className="mt-1">{stay?.piso?.ciudad || "—"}</p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                                Código postal
                                            </p>
                                            <p className="mt-1">{stay?.piso?.codigo_postal || "—"}</p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                                Piso activo
                                            </p>
                                            <p className="mt-1">
                                                {stay?.piso?.activo ? "Sí" : "No"}
                                            </p>
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