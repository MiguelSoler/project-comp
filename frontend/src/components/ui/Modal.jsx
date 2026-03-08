import { useEffect } from "react";

export default function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || "Modal"}
      onClick={() => onClose?.()}
    >
      <div
        className="w-[75vw] max-w-none rounded-xl border border-ui-border bg-ui-surface shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-ui-border p-4">
          <h3 className="text-base font-semibold text-ui-text">{title || ""}</h3>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => onClose?.()}>
            Cerrar
          </button>
        </div>

        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}