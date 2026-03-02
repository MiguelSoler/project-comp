import { Link } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";

export default function HabitacionesList() {
    return (
        <PageShell
            title="Listado de habitaciones"
            subtitle="Placeholder. Aquí irá el grid de cards + filtros (ciudad, precio, disponible)."
            variant="plain"
        >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Link key={i} to={`/habitaciones/${i + 1}`} className="card card-hover">
                        <div className="card-body space-y-2">
                            <div className="skeleton aspect-[4/3] w-full" />
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-base font-semibold">Habitación #{i + 1}</h3>
                                <span className="badge badge-success">Disponible</span>
                            </div>
                            <p className="text-sm text-ui-text-secondary">Ciudad · Precio · Piso (implícito)</p>
                        </div>
                    </Link>
                ))}
            </div>
        </PageShell>
    );
}