const TONE_CLASSES = {
  emerald: "border-emerald-300 bg-emerald-50",
  sky: "border-sky-300 bg-sky-50",
  violet: "border-violet-300 bg-violet-50",
  amber: "border-amber-300 bg-amber-50",
  default: "border-amber-300 bg-amber-50",
};

export default function MetricSummaryCard({
  label,
  value,
  tone = "default",
  description,
  className = "",
  bodyClassName = "card-body",
  labelClassName = "text-xs font-medium uppercase tracking-wide text-ui-text-secondary",
  valueClassName = "mt-2 text-2xl font-bold text-ui-text",
}) {
  const toneClass = TONE_CLASSES[tone] || TONE_CLASSES.default;
  const hasDescription = Boolean(description);

  return (
    <div
      className={`rounded-2xl border ${toneClass} ${className}`}
      tabIndex={hasDescription ? 0 : undefined}
      title={hasDescription ? description : undefined}
      aria-label={hasDescription ? `${label}: ${description}` : undefined}
    >
      <div className={bodyClassName}>
        <p className={labelClassName}>
          {label}
        </p>
        <p className={valueClassName}>
          {value}
        </p>
      </div>
    </div>
  );
}
