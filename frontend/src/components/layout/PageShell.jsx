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
        <div className="space-y-6 md:space-y-8">
          {(title || subtitle || actions) && (
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                {title ? (
                  <h1 className="text-2xl font-bold tracking-tight text-ui-text sm:text-3xl md:text-4xl">
                    {title}
                  </h1>
                ) : null}

                {subtitle ? (
                  <p className="max-w-3xl text-sm leading-6 text-ui-text-secondary md:text-base">
                    {subtitle}
                  </p>
                ) : null}
              </div>

              {actions ? (
                <div className="flex w-full flex-wrap items-stretch gap-2 md:w-auto md:justify-end md:pt-1">
                  {actions}
                </div>
              ) : null}
            </div>
          )}

          {variant === "card" ? (
            <div className="card overflow-hidden">
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