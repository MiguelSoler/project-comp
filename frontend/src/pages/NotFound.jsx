import { Link } from "react-router-dom";
import PageShell from "../components/layout/PageShell.jsx";

export default function NotFound() {
    return (
        <PageShell title="404" subtitle="No existe esta ruta." variant="card" contentClassName="space-y-4">
            <Link className="btn btn-primary" to="/">
                Ir a Home
            </Link>
        </PageShell>
    );
}