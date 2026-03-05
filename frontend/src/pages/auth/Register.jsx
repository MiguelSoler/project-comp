import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import useAuth from "../../hooks/useAuth.js";

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
      setErrorMsg("Revisa los campos obligatorios.");
      return;
    }

    setLoading(true);
    try {
      await register(payload);
      navigate("/"); // ahora / ya muestra habitaciones
    } catch (err) {
      setErrorMsg(err?.error || err?.message || "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Registro"
      subtitle="Crea tu cuenta."
      variant="card"
      contentClassName="max-w-md mx-auto space-y-4"
    >
      {errorMsg ? <div className="alert-error">{errorMsg}</div> : null}

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
            placeholder="Name"
            autoComplete="given-name"
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
            placeholder="apellidos"
            autoComplete="family-name"
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
            placeholder="********"
            autoComplete="new-password"
          />
        </div>

        <button className="btn btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <p className="text-sm text-ui-text-secondary">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="font-medium">
            Inicia sesión
          </Link>
        </p>
      </form>
    </PageShell>
  );
}
