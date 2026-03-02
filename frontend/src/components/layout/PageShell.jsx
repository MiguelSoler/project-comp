import Container from "./Container.jsx";

export default function PageShell({
    title,
    subtitle,
    actions,
    children,
    variant = "plain", // "plain" | "card"
    className = "",
    contentClassName = "",
}) {
    return (
        <section className={`section ${className}`.trim()}>
            <Container>
                <div className="space-y-6">
                    {(title || subtitle || actions) && (
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                                {title && <h1>{title}</h1>}
                                {subtitle && <p className="text-sm text-ui-text-secondary">{subtitle}</p>}
                            </div>
                            {actions && <div className="flex items-center gap-2">{actions}</div>}
                        </div>
                    )}

                    {variant === "card" ? (
                        <div className="card">
                            <div className={`card-body ${contentClassName}`.trim()}>{children}</div>
                        </div>
                    ) : (
                        <div className={contentClassName}>{children}</div>
                    )}
                </div>
            </Container>
        </section>
    );
}