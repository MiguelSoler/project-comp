import { useNavigate } from "react-router-dom";
import PageShell from "../../components/layout/PageShell.jsx";

export default function DashboardAdmin() {
  const navigate = useNavigate();

  const adminSections = [
    {
      id: "pisos",
      title: "Gestión de pisos",
      description:
        "Consulta todos los pisos de la plataforma, revisa su estado y accede al detalle completo de cada uno.",
      badge: "Disponible",
      badgeClassName: "badge badge-success",
      onClick: () => navigate("/admin/pisos"),
    },
    {
      id: "habitaciones",
      title: "Gestión de habitaciones",
      description:
        "Explora todas las habitaciones, aplica filtros avanzados y entra al detalle administrativo de cada habitación.",
      badge: "Disponible",
      badgeClassName: "badge badge-success",
      onClick: () => navigate("/admin/habitaciones"),
    },
    {
      id: "usuarios",
      title: "Gestión de usuarios",
      description:
        "Administra usuarios de la app, edítalos, actívalos o desactívalos y gestiona sus asignaciones a habitaciones.",
      badge: "Disponible",
      badgeClassName: "badge badge-success",
      onClick: () => navigate("/admin/usuarios"),
    },
  ];

  return (
    <PageShell
      title="Panel Admin"
      subtitle="Selecciona el área que quieres administrar."
      variant="plain"
      contentClassName="space-y-6"
    >
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {adminSections.map((section) => (
          <article
            key={section.id}
            role="button"
            tabIndex={0}
            className="card card-hover cursor-pointer"
            onClick={section.onClick}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                section.onClick();
              }
            }}
          >
            <div className="card-body flex h-full flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold tracking-tight text-ui-text">
                  {section.title}
                </h2>

                <span className={section.badgeClassName}>{section.badge}</span>
              </div>

              <p className="text-sm leading-6 text-ui-text-secondary">
                {section.description}
              </p>

              <div className="mt-auto pt-2">
                <span className="inline-flex items-center text-sm font-semibold text-brand-primary">
                  Entrar
                </span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </PageShell>
  );
}