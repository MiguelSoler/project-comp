import PageShell from "../../components/layout/PageShell.jsx";

export default function DashboardManager() {
    return (
        <PageShell
            title="Panel Manager"
            subtitle="Aquí sí tendrá sentido gestionar pisos/habitaciones/fotos/ocupación."
            variant="card"
            contentClassName="space-y-4"
        >
            <p className="text-sm text-ui-text-secondary">Placeholder del panel del manager/anunciante.</p>
        </PageShell>
    );
}