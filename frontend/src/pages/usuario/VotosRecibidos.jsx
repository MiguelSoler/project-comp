import { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth.js";
import { listReceivedVotes } from "../../services/votoUsuarioService.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function buildImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export default function VotosRecibidos() {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState("newest");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadVotes() {
      try {
        setLoading(true);
        setError("");

        const data = await listReceivedVotes(user?.id, { page, limit, sort });

        if (!isMounted) return;

        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotalPages(Number(data?.totalPages || 1));
        setTotal(Number(data?.total || 0));
      } catch (err) {
        if (!isMounted) return;
        setError(err?.message || "No se pudieron cargar los votos recibidos.");
        setItems([]);
        setTotalPages(1);
        setTotal(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (user?.id) {
      loadVotes();
    } else {
      setLoading(false);
      setError("No se ha podido identificar al usuario.");
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id, page, limit, sort]);

  useEffect(() => {
    setPage(1);
  }, [sort]);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  if (loading) {
    return (
      <section className="section">
        <div className="app-container">
          <div className="space-y-4">
            <div className="skeleton h-8 w-56" />
            <div className="skeleton h-32 w-full" />
            <div className="skeleton h-32 w-full" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="app-container">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1>Votos recibidos</h1>
                <p className="text-sm text-ui-text-secondary">
                  Consulta el detalle de las valoraciones que has recibido.
                </p>
              </div>

              <div className="w-full md:w-[260px]">
                <label className="label" htmlFor="sort">
                  Ordenar por
                </label>
                <select
                  id="sort"
                  name="sort"
                  className="select"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="newest">Más recientes</option>
                  <option value="oldest">Más antiguos</option>
                </select>
              </div>
            </div>

            <p className="text-xs text-ui-text-secondary">
              Total de votos recibidos: <span className="font-medium text-ui-text">{total}</span>
            </p>
          </header>

          {error ? <div className="alert-error">{error}</div> : null}

          {!error && items.length === 0 ? (
            <div className="card">
              <div className="card-body">
                <p className="text-ui-text-secondary">
                  Todavía no has recibido ningún voto.
                </p>
              </div>
            </div>
          ) : null}

          {items.length > 0 ? (
            <>
              <div className="space-y-4">
                {items.map((item) => {
                  const nombreCompleto = [item.votante?.nombre, item.votante?.apellidos]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <article key={item.id} className="card">
                      <div className="card-body space-y-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex items-start gap-4">
                            {item.votante?.foto_perfil_url ? (
                              <img
                                src={buildImageUrl(item.votante.foto_perfil_url)}
                                alt={nombreCompleto || "Votante"}
                                className="h-16 w-16 rounded-full border border-ui-border object-cover"
                              />
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-ui-border bg-slate-100 text-sm font-semibold text-ui-text-secondary">
                                {item.votante?.nombre?.slice(0, 1)?.toUpperCase() || "?"}
                              </div>
                            )}

                            <div>
                              <h2 className="text-lg font-semibold">
                                {nombreCompleto || "Sin nombre"}
                              </h2>
                              <p className="text-sm text-ui-text-secondary">
                                {item.piso?.ciudad || "—"}
                                {item.piso?.direccion ? ` · ${item.piso.direccion}` : ""}
                              </p>
                            </div>
                          </div>

                          <span className="badge badge-info">
                            Cambios: {item.num_cambios}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <div className="rounded-lg border border-ui-border bg-slate-50 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                              Limpieza
                            </p>
                            <p className="mt-1 text-lg font-semibold">{item.limpieza}/5</p>
                          </div>

                          <div className="rounded-lg border border-ui-border bg-slate-50 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                              Ruido
                            </p>
                            <p className="mt-1 text-lg font-semibold">{item.ruido}/5</p>
                          </div>

                          <div className="rounded-lg border border-ui-border bg-slate-50 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                              Puntualidad de pagos
                            </p>
                            <p className="mt-1 text-lg font-semibold">
                              {item.puntualidad_pagos}/5
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 text-xs text-ui-text-secondary md:flex-row md:items-center md:justify-between">
                          <span>
                            Creado:{" "}
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString("es-ES")
                              : "—"}
                          </span>

                          <span>
                            Última actualización:{" "}
                            {item.updated_at
                              ? new Date(item.updated_at).toLocaleString("es-ES")
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!hasPrev}
                  onClick={() => setPage((prev) => prev - 1)}
                >
                  Anterior
                </button>

                <p className="text-xs text-ui-text-secondary">
                  Página <span className="font-medium text-ui-text">{page}</span> de{" "}
                  <span className="font-medium text-ui-text">{totalPages}</span>
                </p>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!hasNext}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Siguiente
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}