import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import useAuth from "../../hooks/useAuth.js";

function getLoginErrorMessage(error) {
  const code = error?.error || error?.message;

  switch (code) {
    case "INVALID_CREDENTIALS":
      return "El email o la contraseña no son correctos.";
    case "USER_INACTIVE":
      return "Tu cuenta está inactiva. Ponte en contacto con soporte si necesitas ayuda.";
    case "VALIDATION_ERROR":
      return "Revisa los datos introducidos e inténtalo de nuevo.";
    case "INTERNAL_ERROR":
      return "Ha ocurrido un problema interno. Inténtalo de nuevo en unos minutos.";
    default:
      return "No se pudo iniciar sesión. Inténtalo de nuevo.";
  }
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const emailNorm = email.trim().toLowerCase();

    if (!emailNorm || !password) {
      setErrorMsg("Introduce tu email y tu contraseña.");
      return;
    }

    setLoading(true);

    try {
      await login({ email: emailNorm, password });
      navigate("/habitaciones");
    } catch (err) {
      setErrorMsg(getLoginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Iniciar sesión"
      subtitle="Accede a tu cuenta para continuar."
      variant="plain"
      contentClassName="mx-auto max-w-5xl space-y-6"
    >
      <div className="overflow-hidden rounded-[28px] border border-sky-200 bg-gradient-to-br from-white via-sky-100 to-violet-50 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col justify-between border-b border-sky-200/70 p-6 lg:border-b-0 lg:border-r lg:p-10">
            <div className="space-y-5">
              <div className="inline-flex w-fit items-center rounded-full border border-sky-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
                Bienvenido de nuevo
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight text-ui-text md:text-4xl">
                  Entra en tu cuenta
                </h2>

                <p className="max-w-xl text-sm leading-6 text-ui-text-secondary md:text-base">
                  Accede a tus habitaciones, tu estancia, tus valoraciones y toda la
                  información de convivencia desde un único lugar.
                </p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                  Gestión sencilla
                </p>
                <p className="mt-2 text-sm text-ui-text-secondary">
                  Consulta tu cuenta y accede rápidamente a las funciones principales.
                </p>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">
                  Acceso seguro
                </p>
                <p className="mt-2 text-sm text-ui-text-secondary">
                  Inicia sesión con tus credenciales para continuar donde lo dejaste.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-10">
            <div className="rounded-[24px] border border-white/80 bg-white/85 p-6 shadow-sm backdrop-blur sm:p-8">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold tracking-tight text-ui-text">
                  Login
                </h3>
                <p className="text-sm text-ui-text-secondary">
                  Introduce tus datos para acceder.
                </p>
              </div>

              {errorMsg ? (
                <div className="alert-error mt-6">
                  {errorMsg}
                </div>
              ) : null}

              <form className="mt-6 space-y-5" onSubmit={onSubmit}>
                <div>
                  <label className="label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@email.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="password">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Introduce tu contraseña"
                    disabled={loading}
                  />
                </div>

                <button
                  className="btn btn-primary w-full"
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </button>

                <p className="text-sm text-ui-text-secondary">
                  ¿No tienes cuenta?{" "}
                  <Link to="/register" className="font-semibold text-brand-primary hover:underline">
                    Regístrate
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}