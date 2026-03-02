import PageShell from "../../components/layout/PageShell.jsx";

export default function Login() {
    return (
        <PageShell
            title="Login"
            subtitle="Accede a tu cuenta."
            variant="card"
            contentClassName="max-w-md mx-auto space-y-4"
        >
            <p className="text-sm text-ui-text-secondary">
                Placeholder. Aquí irá el formulario y llamada a AUTH/Login.
            </p>
        </PageShell>
    );
}