import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";
import useAuth from "../../hooks/useAuth.js";

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <PageShell
      title={isAuthenticated ? `Bienvenido${user?.nombre ? `, ${user.nombre}` : ""}` : "Home"}
      subtitle="Encuentra habitación y mira reputación de convivencia (limpieza, ruido, pagos)."
      variant="card"
      contentClassName="space-y-4"
    >
      <div className="flex flex-wrap gap-2">
        <Link className="btn btn-primary" to="/habitaciones">
          Ver habitaciones
        </Link>

        {!isAuthenticated ? (
          <p className="text-sm text-ui-text-secondary">
            Inicia sesión o crea una cuenta desde la barra superior para votar y gestionar tu estancia.
          </p>
        ) : (
          <p className="text-sm text-ui-text-secondary">
            Ya tienes sesión iniciada. Puedes navegar directamente y cerrar sesión desde la barra superior.
          </p>
        )}
      </div>
    </PageShell>
  );
}