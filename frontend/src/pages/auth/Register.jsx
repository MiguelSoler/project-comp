import PageShell from "../../components/layout/PageShell.jsx";

export default function Register() {
    return (
        <PageShell
            title="Registro"
            subtitle="Crea tu cuenta."
            variant="card"
            contentClassName="max-w-md mx-auto space-y-4"
        >
            <p className="text-sm text-ui-text-secondary">
                Placeholder. Aquí irá el formulario y llamada a AUTH/Register.
            </p>
        </PageShell>
    );
}