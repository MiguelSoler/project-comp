import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import useAuth from "../../hooks/useAuth.js";

function getValidationErrorMessage(details = []) {
  const fields = new Set(Array.isArray(details) ? details : []);

  if (fields.size === 0) {
    return "Revisa los datos introducidos y vuelve a intentarlo.";
  }

  if (fields.size === 1 && fields.has("password")) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }

  if (fields.size === 1 && fields.has("email")) {
    return "Introduce un email válido.";
  }

  if (
    fields.size <= 2 &&
    (fields.has("nombre") || fields.has("apellidos")) &&
    !fields.has("email") &&
    !fields.has("password")
  ) {
    return "Completa tu nombre y apellidos.";
  }

  if (
    fields.has("nombre") ||
    fields.has("apellidos") ||
    fields.has("email") ||
    fields.has("password")
  ) {
    return "Revisa los campos obligatorios y asegúrate de que la contraseña tenga al menos 8 caracteres.";
  }

  return "Revisa los datos introducidos y vuelve a intentarlo.";
}

function getRegisterErrorMessage(err) {
  const errorCode = err?.error || err?.message || "";

  if (errorCode === "VALIDATION_ERROR") {
    return getValidationErrorMessage(err?.details);
  }

  if (errorCode === "EMAIL_ALREADY_EXISTS") {
    return "Ya existe una cuenta con ese email. Prueba a iniciar sesión o usa otro correo.";
  }

  if (errorCode === "INTERNAL_ERROR" || errorCode === "INVALID_SERVER_CONFIG") {
    return "Ha ocurrido un error al crear la cuenta. Inténtalo de nuevo dentro de unos minutos.";
  }

  if (typeof err?.message === "string" && !/^[A-Z0-9_]+$/.test(err.message)) {
    return err.message;
  }

  return "No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.";
}

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const payload = {
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      email: email.trim().toLowerCase(),
      password,
      telefono: telefono.trim() || undefined,
    };

    if (!payload.nombre || !payload.apellidos || !payload.email || !payload.password) {
      setErrorMsg("Completa nombre, apellidos, email y contraseña.");
      return;
    }

    if (!payload.email.includes("@")) {
      setErrorMsg("Introduce un email válido.");
      return;
    }

    if (payload.password.length < 8) {
      setErrorMsg("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);

    try {
      await register(payload);
      navigate("/");
    } catch (err) {
      setErrorMsg(getRegisterErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Registro"
      subtitle="Crea tu cuenta."
      variant="plain"
      contentClassName="mx-auto w-full max-w-5xl space-y-6"
    >
      <section className="relative overflow-hidden rounded-[32px] border border-sky-200 bg-gradient-to-br from-sky-100 via-white to-violet-100 p-5 shadow-sm md:p-8">
        <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-44 w-44 rounded-full bg-violet-300/20 blur-3xl" />

        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-white/70 bg-white/60 p-6 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Crear cuenta
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-ui-text md:text-4xl">
                Empieza en pocos segundos
              </h2>

              <p className="mt-3 text-sm leading-6 text-ui-text-secondary">
                Regístrate para acceder a la plataforma y empezar a explorar habitaciones
                y pisos compartidos.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  Obligatorio
                </p>
                <p className="mt-2 text-sm font-semibold text-ui-text">
                  Nombre, apellidos, email y contraseña
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
                  Contraseña
                </p>
                <p className="mt-2 text-sm font-semibold text-ui-text">
                  Mínimo 8 caracteres
                </p>
              </div>

              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
                  Opcional
                </p>
                <p className="mt-2 text-sm font-semibold text-ui-text">
                  Puedes añadir tu teléfono ahora o más adelante
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-lg backdrop-blur md:p-7">
            {errorMsg ? (
              <div className="alert-error mb-5" aria-live="polite">
                {errorMsg}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="label" htmlFor="nombre">
                  Nombre *
                </label>
                <input
                  id="nombre"
                  className="input"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  autoComplete="given-name"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="label" htmlFor="apellidos">
                  Apellidos *
                </label>
                <input
                  id="apellidos"
                  className="input"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  placeholder="Tus apellidos"
                  autoComplete="family-name"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="label" htmlFor="email">
                  Email *
                </label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@email.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="label" htmlFor="telefono">
                  Teléfono (opcional)
                </label>
                <input
                  id="telefono"
                  className="input"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+34 600 000 000"
                  autoComplete="tel"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="label" htmlFor="password">
                  Contraseña *
                </label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  minLength={8}
                  disabled={loading}
                />
                <p className="mt-2 text-xs text-ui-text-secondary">
                  La contraseña debe tener al menos 8 caracteres.
                </p>
              </div>

              <button
                className="btn btn-primary mt-2 w-full"
                type="submit"
                disabled={loading}
              >
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </button>

              <p className="text-sm text-ui-text-secondary">
                ¿Ya tienes cuenta?{" "}
                <Link to="/login" className="font-medium text-brand-primary">
                  Inicia sesión
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </PageShell>
  );
}