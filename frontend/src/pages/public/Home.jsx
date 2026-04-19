import { Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth.js";

const featureCardClass =
  "rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur";

const statCardClass =
  "rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  const panelPath =
    user?.rol === "admin"
      ? "/admin"
      : user?.rol === "advertiser"
        ? "/manager"
        : null;

  return (
    <section className="section bg-gradient-to-br from-sky-100 via-blue-100 to-indigo-50">
      <div className="app-container">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[32px] border border-emerald-200/80 bg-white/45 shadow-sm backdrop-blur">
            <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="p-6 md:p-8 xl:p-10">
                <div className="inline-flex items-center rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Encuentra mejor convivencia
                </div>

                <div className="mt-5 space-y-4">
                  <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ui-text md:text-5xl xl:text-6xl">
                    Tu app para encontrar habitación y entender cómo se vive allí
                  </h1>

                  <p className="max-w-2xl text-sm leading-6 text-ui-text-secondary md:text-base">
                    Compara habitaciones, revisa la convivencia actual del piso y
                    decide con más contexto antes de mudarte.
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link to="/habitaciones" className="btn btn-primary">
                    Ver habitaciones
                  </Link>

                  {!isAuthenticated ? (
                    <>
                      <Link
                        to="/register"
                        className="btn border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      >
                        Crear cuenta
                      </Link>

                      <Link to="/login" className="btn btn-secondary">
                        Iniciar sesión
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/mi-estancia"
                        className="btn border border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      >
                        Mi estancia
                      </Link>

                      <Link to="/perfil" className="btn btn-secondary">
                        Mi perfil
                      </Link>

                      {panelPath ? (
                        <Link to={panelPath} className="btn btn-secondary">
                          Ir al panel
                        </Link>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className={statCardClass}>
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                      Más contexto
                    </p>
                    <p className="mt-2 text-sm font-semibold text-ui-text">
                      Consulta convivencia real del piso
                    </p>
                  </div>

                  <div className={statCardClass}>
                    <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
                      Más claridad
                    </p>
                    <p className="mt-2 text-sm font-semibold text-ui-text">
                      Revisa habitaciones y condiciones
                    </p>
                  </div>

                  <div className={statCardClass}>
                    <p className="text-xs font-medium uppercase tracking-wide text-lime-700">
                      Más confianza
                    </p>
                    <p className="mt-2 text-sm font-semibold text-ui-text">
                      Valora y conoce a futuros compañeros
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-emerald-200/70 bg-white/30 p-6 md:p-8 xl:border-l xl:border-t-0 xl:p-10">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className={`${featureCardClass} sm:col-span-2`}>
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                      Qué puedes hacer
                    </p>
                    <p className="mt-2 text-lg font-semibold text-ui-text">
                      Todo lo importante, sin rodeos
                    </p>
                  </div>

                  <div className={featureCardClass}>
                    <p className="text-2xl">🏠</p>
                    <p className="mt-3 text-sm font-semibold text-ui-text">
                      Explorar habitaciones
                    </p>
                    <p className="mt-1 text-sm text-ui-text-secondary">
                      Filtra por ciudad, precio y características.
                    </p>
                  </div>

                  <div className={featureCardClass}>
                    <p className="text-2xl">👥</p>
                    <p className="mt-3 text-sm font-semibold text-ui-text">
                      Ver convivencia
                    </p>
                    <p className="mt-1 text-sm text-ui-text-secondary">
                      Comprueba cómo es el ambiente actual del piso.
                    </p>
                  </div>

                  <div className={featureCardClass}>
                    <p className="text-2xl">⭐</p>
                    <p className="mt-3 text-sm font-semibold text-ui-text">
                      Consultar reputación
                    </p>
                    <p className="mt-1 text-sm text-ui-text-secondary">
                      Mira valoraciones útiles antes de decidir.
                    </p>
                  </div>

                  <div className={featureCardClass}>
                    <p className="text-2xl">🛠️</p>
                    <p className="mt-3 text-sm font-semibold text-ui-text">
                      Gestionar tu estancia
                    </p>
                    <p className="mt-1 text-sm text-ui-text-secondary">
                      Accede a tus datos, convivencia y perfil.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                  1
                </div>
                <h2 className="text-base font-semibold text-ui-text">
                  Busca una habitación
                </h2>
              </div>

              <p className="mt-3 text-sm text-ui-text-secondary">
                Revisa ubicación, precio y detalles del anuncio.
              </p>
            </div>

            <div className="rounded-2xl border border-teal-200 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                  2
                </div>
                <h2 className="text-base font-semibold text-ui-text">
                  Comprueba la convivencia
                </h2>
              </div>

              <p className="mt-3 text-sm text-ui-text-secondary">
                Mira medias, convivientes actuales y señales útiles del piso.
              </p>
            </div>

            <div className="rounded-2xl border border-lime-200 bg-white/80 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-100 text-sm font-bold text-lime-700">
                  3
                </div>
                <h2 className="text-base font-semibold text-ui-text">
                  Decide con más criterio
                </h2>
              </div>

              <p className="mt-3 text-sm text-ui-text-secondary">
                Elige mejor y, cuando convivas, deja también tu valoración.
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-200 bg-white/70 p-6 shadow-sm backdrop-blur md:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  Acceso rápido
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-ui-text md:text-3xl">
                  Empieza en segundos
                </h2>
                <p className="text-sm text-ui-text-secondary">
                  Entra directamente a lo que necesitas.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Link
                  to="/habitaciones"
                  className="rounded-2xl border border-white/80 bg-white px-5 py-4 text-sm font-semibold text-ui-text shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  Ver habitaciones
                </Link>

                {!isAuthenticated ? (
                  <>
                    <Link
                      to="/register"
                      className="rounded-2xl border border-white/80 bg-white px-5 py-4 text-sm font-semibold text-ui-text shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      Crear cuenta
                    </Link>

                    <Link
                      to="/login"
                      className="rounded-2xl border border-white/80 bg-white px-5 py-4 text-sm font-semibold text-ui-text shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      Iniciar sesión
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/mi-estancia"
                      className="rounded-2xl border border-white/80 bg-white px-5 py-4 text-sm font-semibold text-ui-text shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      Mi estancia
                    </Link>

                    <Link
                      to="/perfil"
                      className="rounded-2xl border border-white/80 bg-white px-5 py-4 text-sm font-semibold text-ui-text shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      Perfil
                    </Link>
                  </>
                )}

                {isAuthenticated && panelPath ? (
                  <Link
                    to={panelPath}
                    className="rounded-2xl border border-white/80 bg-white px-5 py-4 text-sm font-semibold text-ui-text shadow-sm transition-transform hover:-translate-y-0.5"
                  >
                    Ir al panel
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}