export default function ResponsiveDisclosureCard({
  id,
  open,
  onToggle,
  accentClassName = "bg-sky-500",
  summary,
  children,
  className = "",
}) {
  function handleKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onToggle?.();
  }

  return (
    <article
      className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`.trim()}
    >
      <div className={`h-2 w-full ${accentClassName}`} />

      <div
        role="button"
        tabIndex={0}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-50 md:cursor-default md:hover:bg-white"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={open}
        aria-controls={id}
      >
        <div className="min-w-0 flex-1">{summary}</div>

        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-semibold text-ui-text shadow-sm md:hidden">
          {open ? "-" : "+"}
        </span>
      </div>

      <div
        id={id}
        className={`${open ? "block" : "hidden"} border-t border-slate-100 md:block`}
      >
        <div className="card-body space-y-4">{children}</div>
      </div>
    </article>
  );
}
