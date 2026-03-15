import { useEffect, useState } from "react";

export default function Modal({
  open,
  title,
  children,
  onClose,
  size = "default",
  tone = "default",
  closeLabel = "Cerrar",
  closeOnOverlay = true,
  showCloseButton = true,
}) {
  const [isRendered, setIsRendered] = useState(open);
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setIsRendered(true);

      const raf = requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => cancelAnimationFrame(raf);
    }

    setIsVisible(false);

    const timeout = setTimeout(() => {
      setIsRendered(false);
    }, 180);

    return () => clearTimeout(timeout);
  }, [open]);

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

  if (!isRendered) return null;

  const sizeClass =
    size === "md"
      ? "w-full max-w-xl"
      : size === "lg"
      ? "w-full max-w-3xl"
      : "w-[75vw] max-w-none";

  const headerClass =
    tone === "danger"
      ? "flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 p-4"
      : "flex items-center justify-between gap-3 border-b border-ui-border p-4";

  const titleClass =
    tone === "danger"
      ? "text-base font-semibold text-red-700"
      : "text-base font-semibold text-ui-text";

  const closeBtnClass =
    tone === "danger"
      ? "btn btn-sm border border-red-200 bg-white text-red-700 hover:bg-red-50"
      : "btn btn-ghost btn-sm";

  function handleOverlayClick() {
    if (closeOnOverlay) onClose?.();
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-400 ease-out ${
        isVisible ? "bg-black/40 opacity-100" : "bg-black/0 opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={title || "Modal"}
      onClick={handleOverlayClick}
    >
      <div
        className={`${sizeClass} overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-modal transition-all duration-400 ease-out ${
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-1 scale-[0.992] opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={headerClass}>
          <h3 className={titleClass}>{title || ""}</h3>
          {showCloseButton ? (
            <button className={closeBtnClass} type="button" onClick={() => onClose?.()}>
              {closeLabel}
            </button>
          ) : null}
        </div>

        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}