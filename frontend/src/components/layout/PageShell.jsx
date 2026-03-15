import Container from "./Container.jsx";

export default function PageShell({
  title,
  subtitle,
  actions,
  children,
  variant = "plain",
  className = "",
  contentClassName = "",
}) {
  return (
    <section className={`section ${className}`.trim()}>
      <Container>
        <div className="space-y-8">
          {(title || subtitle || actions) && (
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                {title ? (
                  <h1 className="text-3xl font-bold tracking-tight text-ui-text md:text-4xl">
                    {title}
                  </h1>
                ) : null}

                {subtitle ? (
                  <p className="max-w-3xl text-sm text-ui-text-secondary md:text-base">
                    {subtitle}
                  </p>
                ) : null}
              </div>

              {actions ? (
                <div className="flex items-center gap-2 md:pt-1">
                  {actions}
                </div>
              ) : null}
            </div>
          )}

          {variant === "card" ? (
            <div className="card">
              <div className={`card-body ${contentClassName}`.trim()}>
                {children}
              </div>
            </div>
          ) : (
            <div className={contentClassName}>{children}</div>
          )}
        </div>
      </Container>
    </section>
  );
}