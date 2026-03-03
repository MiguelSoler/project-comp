import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import useAuth from "../../hooks/useAuth.js";

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
      setErrorMsg("Introduce email y contraseña.");
      return;
    }

    setLoading(true);
    try {
      await login({ email: emailNorm, password });
      navigate("/habitaciones");
    } catch (err) {
      setErrorMsg(err?.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Login"
      subtitle="Accede a tu cuenta."
      variant="card"
      contentClassName="max-w-md mx-auto space-y-4"
    >
      {errorMsg ? <div className="alert-error">{errorMsg}</div> : null}

      <form className="space-y-4" onSubmit={onSubmit}>
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
            placeholder="tu@email.com"
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
            placeholder="********"
          />
        </div>

        <button className="btn btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-sm text-ui-text-secondary">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="font-medium">
            Regístrate
          </Link>
        </p>
      </form>
    </PageShell>
  );
}