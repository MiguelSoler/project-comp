import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import { listAdminPisos } from "../../services/adminPisoService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function buildImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default function DashboardManager() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPisos() {
      try {
        setLoading(true);
        setError("");

        const data = await listAdminPisos({ page, limit });

        if (!isMounted) return;

        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotalPages(Number(data?.totalPages || 1));
        setTotal(Number(data?.total || 0));
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudieron cargar tus pisos.");
        setItems([]);
        setTotalPages(1);
        setTotal(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPisos();

    return () => {
      isMounted = false;
    };
  }, [page, limit]);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <PageShell
      title="Panel Manager"
      subtitle={`Gestiona tus pisos publicados. Total: ${total}`}
      variant="plain"
      contentClassName="space-y-4"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!hasPrev || loading}
            onClick={() => setPage((prev) => prev - 1)}
          >
            Anterior
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={!hasNext || loading}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Siguiente
          </button>
        </div>
      }
    >
      {error ? <div className="alert-error">{error}</div> : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="card">
              <div className="card-body space-y-3">
                <div className="skeleton aspect-[4/3] w-full" />
                <div className="skeleton h-5 w-2/3" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-ui-text-secondary">
              Todavía no tienes pisos creados.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((piso) => {
              const cover = buildImageUrl(piso.cover_foto_piso_url);

              return (
                <Link
                  key={piso.id}
                  to={`/manager/piso/${piso.id}`}
                  className="card card-hover"
                >
                  <div className="card-body space-y-3">
                    {cover ? (
                      <img
                        src={cover}
                        alt={piso.direccion || `Piso ${piso.id}`}
                        className="aspect-[4/3] w-full rounded-md object-cover"
                      />
                    ) : (
                      <div className="skeleton aspect-[4/3] w-full" />
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-base font-semibold text-ui-text">
                        {piso.direccion || "Sin dirección"}
                      </h2>

                      <span className={piso.activo ? "badge badge-success" : "badge badge-neutral"}>
                        {piso.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <p className="text-sm text-ui-text-secondary">
                      {piso.ciudad || "—"}
                      {piso.codigo_postal ? ` · ${piso.codigo_postal}` : ""}
                    </p>

                    <p className="text-sm text-ui-text-secondary line-clamp-3">
                      {piso.descripcion || "Sin descripción."}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-ui-text-secondary">
              Página <span className="font-medium text-ui-text">{page}</span> de{" "}
              <span className="font-medium text-ui-text">{totalPages}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!hasPrev || loading}
                onClick={() => setPage((prev) => prev - 1)}
              >
                Anterior
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!hasNext || loading}
                onClick={() => setPage((prev) => prev + 1)}
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