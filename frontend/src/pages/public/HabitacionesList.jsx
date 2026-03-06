import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import PageShell from "../../components/layout/PageShell.jsx";
import { listHabitaciones } from "../../services/habitacionService.js";

function formatEur(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("es-ES").format(n) + " €";
}

function buildImageUrl(pathOrNull) {
  if (!pathOrNull) return null;
  if (pathOrNull.startsWith("http")) return pathOrNull;

  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  return `${base}${pathOrNull}`;
}

export default function HabitacionesList() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMsg("");

      try {
        const res = await listHabitaciones({ page, limit });

        if (cancelled) return;

        setItems(Array.isArray(res.items) ? res.items : []);
        setTotalPages(Number(res.totalPages || 1));
        setTotal(Number(res.total || 0));
      } catch (err) {
        if (cancelled) return;

        setErrorMsg(err?.error || err?.message || "No se pudieron cargar las habitaciones.");
        setItems([]);
        setTotalPages(1);
        setTotal(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const subtitle = useMemo(() => {
    return `Página ${page} de ${totalPages} · Total: ${total}`;
  }, [page, totalPages, total]);

  return (
    <PageShell
      title="Habitaciones"
      subtitle={subtitle}
      variant="plain"
      actions={
        <div className="flex items-center gap-2">
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            disabled={!hasPrev || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </button>
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            disabled={!hasNext || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </button>
        </div>
      }
    >
      {errorMsg ? (
        <div className="alert-error">
          {errorMsg}{" "}
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setPage((p) => p)}>
            Reintentar
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card">
              <div className="card-body space-y-3">
                <div className="skeleton aspect-[4/3] w-full" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-ui-text-secondary">No hay habitaciones para mostrar.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((h) => {
              const disponible = Boolean(h.disponible) && !Boolean(h.ocupada);
              const cover = buildImageUrl(h.cover_foto_habitacion_url || h.cover_foto_piso_url);

              return (
                <Link key={h.id} to={`/habitaciones/${h.id}`} className="card card-hover">
                  <div className="card-body space-y-2">
                    {cover ? (
                      <img
                        className="aspect-[4/3] w-full rounded-md object-cover"
                        src={cover}
                        alt={h.titulo || `Habitación ${h.id}`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="skeleton aspect-[4/3] w-full" />
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold">{h.titulo}</h3>
                      <span className={disponible ? "badge badge-success" : "badge badge-neutral"}>
                        {disponible ? "Disponible" : "No disponible"}
                      </span>
                    </div>

                    <p className="text-sm text-ui-text-secondary">
                      <span className="font-medium text-ui-text">{formatEur(h.precio_mensual)}</span>{" "}
                      / mes
                      {h.tamano_m2 ? ` · ${h.tamano_m2} m²` : ""}
                    </p>

                    <p className="text-xs text-ui-text-secondary">
                      {h.ciudad ? `${h.ciudad} · ` : ""}
                      {h.amueblada ? "Amueblada · " : ""}
                      {h.bano ? "Baño · " : ""}
                      {h.balcon ? "Balcón" : ""}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 pt-4">
            <p className="text-xs text-ui-text-secondary">
              Página <span className="font-medium text-ui-text">{page}</span> de{" "}
              <span className="font-medium text-ui-text">{totalPages}</span> · Total:{" "}
              <span className="font-medium text-ui-text">{total}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                disabled={!hasPrev || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                disabled={!hasNext || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}