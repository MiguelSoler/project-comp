import { Link, useParams } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";

export default function HabitacionDetail() {
    const { habitacionId } = useParams();

    return (
        <PageShell
            title={`Detalle habitación #${habitacionId}`}
            subtitle="Placeholder. Aquí irá detalle + fotos + info útil del piso (zonas comunes) + reputación convivientes."
            variant="plain"
            actions={
                <Link className="btn btn-secondary btn-sm" to="/habitaciones">
                    Volver
                </Link>
            }
        >
            <div className="card">
                <div className="card-body space-y-3">
                    <p className="text-sm text-ui-text-secondary">
                        Aquí irá: precio, descripción, disponibilidad, fotos de habitación, y un resumen de convivencia.
                    </p>
                </div>
            </div>
        </PageShell>
    );
}