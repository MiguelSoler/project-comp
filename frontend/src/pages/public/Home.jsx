import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";

export default function Home() {
    return (
        <PageShell
            title="Home"
            subtitle="Encuentra habitación y mira reputación de convivencia (limpieza, ruido, pagos)."
            variant="card"
            contentClassName="space-y-4"
        >
            <div className="flex flex-wrap gap-2">
                <Link className="btn btn-primary" to="/habitaciones">
                    Ver habitaciones
                </Link>
                <Link className="btn btn-secondary" to="/login">
                    Iniciar sesión
                </Link>
                <Link className="btn btn-secondary" to="/register">
                    Crear cuenta
                </Link>
            </div>
        </PageShell>
    );
}