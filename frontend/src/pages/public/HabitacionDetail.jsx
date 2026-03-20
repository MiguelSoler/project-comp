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

function buildImageUrl(pathOrNull) {
  if (!pathOrNull) return null;
  if (pathOrNull.startsWith("http")) return pathOrNull;

  const base = import.meta.env.VITE_API_BASE_URL || "";
  return `${base}${pathOrNull}`;
}

function Feature({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ui-border py-2 last:border-b-0">
      <span className="text-sm text-ui-text-secondary">{label}</span>
      <span className="text-sm text-ui-text font-medium">{value}</span>
    </div>
  );
}

export default function HabitacionDetail() {
  const { habitacionId } = useParams();

  const [habitacion, setHabitacion] = useState(null);
  const [fotos, setFotos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFotoUrl, setActiveFotoUrl] = useState(null);

  const openFoto = (url) => {
    if (!url) return;
    setActiveFotoUrl(url);
    setIsModalOpen(true);
  };

  const closeFoto = () => {
    setIsModalOpen(false);
    setActiveFotoUrl(null);
  };

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
      } catch (err) {
        if (cancelled) return;

        setErrorMsg(err?.error || err?.message || "No se pudo cargar la habitación.");
        setHabitacion(null);
        setFotos([]);
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
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 space-y-4">
            <div className="skeleton aspect-[4/3] w-full" />
            <div className="card">
              <div className="card-body space-y-3">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-4 w-2/3" />
              </div>
            </div>
          </div>
          <aside className="lg:col-span-4 space-y-4">
            <div className="card">
              <div className="card-body space-y-3">
                <div className="skeleton h-6 w-1/2" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-full" />
              </div>
            </div>
          </aside>
        </div>
      ) : !habitacion ? (
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-ui-text-secondary">No se encontró la habitación.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main */}
          <div className="lg:col-span-8 space-y-4">
            {/* Cover + gallery */}
            {coverUrl ? (
              <img
                className="aspect-[4/3] w-full rounded-lg object-cover border border-ui-border cursor-zoom-in"
                src={coverUrl}
                alt={habitacion.titulo}
                loading="lazy"
                onClick={() => openFoto(coverUrl)}
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
                      className="rounded-md border border-ui-border overflow-hidden cursor-zoom-in"
                      onClick={() => openFoto(url)}
                      aria-label={`Abrir foto ${f.orden + 1}`}
                    >
                      <img className="aspect-[4/3] w-full object-cover" src={url} alt={`Foto ${f.orden + 1}`} loading="lazy" />
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Descripción */}
            <div className="card">
              <div className="card-body space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold">Descripción</h3>
                  <span className={isDisponible ? "badge badge-success" : "badge badge-neutral"}>
                    {isDisponible ? "Disponible" : "No disponible"}
                  </span>
                </div>

                <p className="text-sm text-ui-text-secondary whitespace-pre-line">
                  {habitacion.descripcion || "Sin descripción."}
                </p>

                {habitacion.direccion ? (
                  <p className="text-sm text-ui-text-secondary">
                    <span className="font-medium text-ui-text">Dirección:</span> {habitacion.direccion}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Info del piso (contexto) */}
            {habitacion.piso_descripcion ? (
              <div className="card">
                <div className="card-body space-y-2">
                  <h3 className="text-base font-semibold">Sobre el piso</h3>
                  <p className="text-sm text-ui-text-secondary whitespace-pre-line">{habitacion.piso_descripcion}</p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="card">
              <div className="card-body space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm text-ui-text-secondary">Precio</p>
                    <p className="text-2xl font-bold text-ui-text">{formatEur(habitacion.precio_mensual)}</p>
                    <p className="text-xs text-ui-text-secondary">al mes</p>
                  </div>
                  <span className={isDisponible ? "badge badge-success" : "badge badge-neutral"}>
                    {isDisponible ? "Disponible" : "Ocupada"}
                  </span>
                </div>

                <div className="border-t border-ui-border pt-2">
                  <Feature label="Tamaño" value={habitacion.tamano_m2 ? `${habitacion.tamano_m2} m²` : "—"} />
                  <Feature label="Amueblada" value={habitacion.amueblada ? "Sí" : "No"} />
                  <Feature label="Baño" value={habitacion.bano ? "Sí" : "No"} />
                  <Feature label="Balcón" value={habitacion.balcon ? "Sí" : "No"} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body space-y-3">
                <h3 className="text-base font-semibold">Acciones</h3>
                <button className="btn btn-primary w-full" type="button" disabled>
                  Solicitar (MVP próximamente)
                </button>
                <p className="text-xs text-ui-text-secondary">
                  Más adelante: solicitar habitación, ver convivientes y reputación del piso.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}

      <Modal open={isModalOpen} title="Foto" onClose={closeFoto}>
        {activeFotoUrl ? (
          <img className="w-full max-h-[75vh] object-contain rounded-md" src={activeFotoUrl} alt="Foto ampliada" />
        ) : null}
      </Modal>
    </PageShell>
  );
}