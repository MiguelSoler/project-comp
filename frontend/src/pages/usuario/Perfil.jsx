import { useEffect, useState } from "react";
import { getMyProfile, updateMyProfile } from "../../services/usuarioService.js";
import useAuth from "../../hooks/useAuth.js";

const EMPTY_FORM = {
    nombre: "",
    telefono: "",
    foto_perfil_url: "",
};

export default function Perfil() {
    const { setUser } = useAuth();

    const [form, setForm] = useState(EMPTY_FORM);
    const [meta, setMeta] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadProfile() {
            try {
                setLoading(true);
                setError("");
                const data = await getMyProfile();
                const user = data?.user;

                if (!isMounted) return;

                setMeta(user || null);
                setForm({
                    nombre: user?.nombre || "",
                    telefono: user?.telefono || "",
                    foto_perfil_url: user?.foto_perfil_url || "",
                });
            } catch (err) {
                if (!isMounted) return;
                setError(err?.message || "No se pudo cargar el perfil.");
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadProfile();

        return () => {
            isMounted = false;
        };
    }, []);

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const payload = {
                nombre: form.nombre,
                telefono: form.telefono,
                foto_perfil_url: form.foto_perfil_url,
            };

            const data = await updateMyProfile(payload);
            const updatedUser = data?.user;

            setMeta(updatedUser || null);
            setForm({
                nombre: updatedUser?.nombre || "",
                telefono: updatedUser?.telefono || "",
                foto_perfil_url: updatedUser?.foto_perfil_url || "",
            });

            if (updatedUser) {
                setUser(updatedUser);
            }

            setSuccess("Perfil actualizado correctamente.");
        } catch (err) {
            setError(err?.message || "No se pudo actualizar el perfil.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <section className="section">
                <div className="app-container">
                    <div className="card">
                        <div className="card-body space-y-4">
                            <div className="skeleton h-8 w-48" />
                            <div className="skeleton h-10 w-full" />
                            <div className="skeleton h-10 w-full" />
                            <div className="skeleton h-10 w-full" />
                            <div className="skeleton h-10 w-32" />
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="section">
            <div className="app-container">
                <div className="mx-auto max-w-3xl space-y-6">
                    <header className="space-y-2">
                        <h1>Mi perfil</h1>
                        <p className="text-sm text-ui-text-secondary">
                            Consulta y actualiza tus datos personales.
                        </p>
                    </header>

                    {error ? <div className="alert-error">{error}</div> : null}
                    {success ? <div className="alert-success">{success}</div> : null}

                    <div className="card">
                        <div className="card-body space-y-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                        Email
                                    </p>
                                    <p className="mt-1">{meta?.email || "—"}</p>
                                </div>

                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-ui-text-secondary">
                                        Rol
                                    </p>
                                    <p className="mt-1">{meta?.rol || "—"}</p>
                                </div>
                            </div>

                            <form className="space-y-4" onSubmit={handleSubmit}>
                                <div>
                                    <label className="label" htmlFor="nombre">
                                        Nombre
                                    </label>
                                    <input
                                        id="nombre"
                                        name="nombre"
                                        type="text"
                                        className="input"
                                        value={form.nombre}
                                        onChange={handleChange}
                                        disabled={saving}
                                    />
                                </div>

                                <div>
                                    <label className="label" htmlFor="telefono">
                                        Teléfono
                                    </label>
                                    <input
                                        id="telefono"
                                        name="telefono"
                                        type="text"
                                        className="input"
                                        value={form.telefono}
                                        onChange={handleChange}
                                        disabled={saving}
                                    />
                                </div>

                                <div>
                                    <label className="label" htmlFor="foto_perfil_url">
                                        URL de foto de perfil
                                    </label>
                                    <input
                                        id="foto_perfil_url"
                                        name="foto_perfil_url"
                                        type="text"
                                        className="input"
                                        value={form.foto_perfil_url}
                                        onChange={handleChange}
                                        disabled={saving}
                                    />
                                </div>

                                <div className="flex items-center justify-end">
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={saving}
                                        aria-busy={saving}
                                    >
                                        {saving ? "Guardando..." : "Guardar cambios"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}