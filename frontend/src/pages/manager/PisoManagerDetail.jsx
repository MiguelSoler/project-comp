import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { getAdminPisoById, listAdminHabitacionesByPiso } from "../../services/adminPisoService.js";
import {
  deactivateAdminHabitacion,
  reactivateAdminHabitacion,
} from "../../services/adminHabitacionService.js";

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
  const [changingId, setChangingId] = useState(null);
  const [habitacionToDeactivate, setHabitacionToDeactivate] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

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

  function requestDeactivateHabitacion(habitacion) {
    setHabitacionToDeactivate(habitacion);
  }

  function closeDeactivateModal() {
    if (changingId) return;
    setHabitacionToDeactivate(null);
  }

  async function handleConfirmDeactivateHabitacion() {
    const habitacion = habitacionToDeactivate;
    if (!habitacion) return;

    try {
      setChangingId(habitacion.id);
      setError("");
      setSuccess("");

      const data = await deactivateAdminHabitacion(habitacion.id);
      const updatedHabitacion = data?.habitacion;

      setHabitaciones((prev) =>
        prev.map((item) =>
          item.id === habitacion.id
            ? { ...item, activo: updatedHabitacion?.activo ?? false }
            : item
        )
      );

      setPiso((prev) => {
        if (!prev) return prev;

        const wasActive = Boolean(habitacion.activo);
        const wasAvailableAndActive = Boolean(habitacion.activo && habitacion.disponible);

        return {
          ...prev,
          habitaciones_activas: wasActive
            ? Math.max(0, Number(prev.habitaciones_activas ?? 0) - 1)
            : Number(prev.habitaciones_activas ?? 0),
          habitaciones_disponibles: wasAvailableAndActive
            ? Math.max(0, Number(prev.habitaciones_disponibles ?? 0) - 1)
            : Number(prev.habitaciones_disponibles ?? 0),
        };
      });

      setSuccess("Habitación desactivada correctamente.");
      setHabitacionToDeactivate(null);
    } catch (err) {
      setError(err?.error || err?.message || "No se pudo desactivar la habitación.");
    } finally {
      setChangingId(null);
    }
  }

  async function handleReactivateHabitacion(habitacion) {
    try {
      setChangingId(habitacion.id);
      setError("");
      setSuccess("");

      const data = await reactivateAdminHabitacion(habitacion.id);
      const updatedHabitacion = data?.habitacion;

      setHabitaciones((prev) =>
        prev.map((item) =>
          item.id === habitacion.id
            ? { ...item, activo: updatedHabitacion?.activo ?? true }
            : item
        )
      );

      setPiso((prev) => {
        if (!prev) return prev;

        const wasInactive = !habitacion.activo;
        const becomesAvailableAndActive = !habitacion.activo && habitacion.disponible;

        return {
          ...prev,
          habitaciones_activas: wasInactive
            ? Number(prev.habitaciones_activas ?? 0) + 1
            : Number(prev.habitaciones_activas ?? 0),
          habitaciones_disponibles: becomesAvailableAndActive
            ? Number(prev.habitaciones_disponibles ?? 0) + 1
            : Number(prev.habitaciones_disponibles ?? 0),
        };
      });

      setSuccess("Habitación reactivada correctamente.");
    } catch (err) {
      setError(err?.error || err?.message || "No se pudo reactivar la habitación.");
    } finally {
      setChangingId(null);
    }
  }

  const cover = buildImageUrl(piso?.cover_foto_piso_url);

  return (
    <>
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
        {success ? <div className="alert-success">{success}</div> : null}

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
                    const isInactive = !habitacion.activo;

                    return (
                      <article
                        key={habitacion.id}
                        className={`card flex h-full flex-col transition-opacity ${
                          isInactive ? "opacity-45" : ""
                        }`}
                      >
                        <div className="card-body flex flex-1 flex-col gap-3">
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
                            <h4 className="min-h-[56px] text-base font-semibold text-ui-text">
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

                          <div className="mt-auto flex items-center justify-end gap-2 pt-1">
                            <Link
                              to={`/manager/habitacion/${habitacion.id}`}
                              className="btn btn-sm border border-blue-300 bg-blue-100 text-brand-primary hover:bg-blue-200"
                            >
                              Gestionar
                            </Link>

                            {habitacion.activo ? (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={changingId === habitacion.id}
                                onClick={() => requestDeactivateHabitacion(habitacion)}
                              >
                                {changingId === habitacion.id ? "Desactivando..." : "Desactivar"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={changingId === habitacion.id}
                                onClick={() => handleReactivateHabitacion(habitacion)}
                              >
                                {changingId === habitacion.id ? "Reactivando..." : "Reactivar"}
                              </button>
                            )}
                          </div>
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

      <Modal
        open={Boolean(habitacionToDeactivate)}
        title="Confirmar desactivación"
        onClose={closeDeactivateModal}
        size="md"
        tone="danger"
        closeLabel="Cancelar"
        closeOnOverlay={false}
        showCloseButton={false}
      >
        <div className="space-y-4">
          <p className="text-sm text-ui-text-secondary">
            Vas a desactivar esta habitación y dejará de estar disponible en la parte pública.
          </p>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              {habitacionToDeactivate?.titulo || "Habitación sin título"}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={closeDeactivateModal}
              disabled={Boolean(changingId)}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleConfirmDeactivateHabitacion}
              disabled={Boolean(changingId)}
            >
              {changingId ? "Desactivando..." : "Sí, desactivar"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}