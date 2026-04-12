import { useEffect, useMemo, useState } from "react";

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
  const [isVisible, setIsVisible] = useState(false);

  // Guardamos el último contenido válido para que el modal
  // no se vacíe mientras hace la animación de cierre.
  const [cachedTitle, setCachedTitle] = useState(title);
  const [cachedChildren, setCachedChildren] = useState(children);
  const [cachedTone, setCachedTone] = useState(tone);
  const [cachedSize, setCachedSize] = useState(size);

  useEffect(() => {
    if (open) {
      setCachedTitle(title);
      setCachedChildren(children);
      setCachedTone(tone);
      setCachedSize(size);
    }
  }, [open, title, children, tone, size]);

  useEffect(() => {
    let enterTimer;
    let exitTimer;

    if (open) {
      // 1) Montamos el modal
      setIsRendered(true);

      // 2) Esperamos un poco para que el navegador pinte primero
      //    el estado inicial opacity-0, y luego haga el fade real.
      enterTimer = setTimeout(() => {
        setIsVisible(true);
      }, 25);
    } else {
      // 1) Lanzamos fade-out
      setIsVisible(false);

      // 2) Esperamos a que termine antes de desmontar
      exitTimer = setTimeout(() => {
        setIsRendered(false);
      }, 320);
    }

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [open]);

  useEffect(() => {
  if (!open) return;

  const onKeyDown = (e) => {
    if (e.key === "Escape") onClose?.();
  };

  const previousBodyOverflow = document.body.style.overflow;
  const previousBodyPaddingRight = document.body.style.paddingRight;

  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;

  document.addEventListener("keydown", onKeyDown);
  document.body.style.overflow = "hidden";

  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  return () => {
    document.removeEventListener("keydown", onKeyDown);
    document.body.style.overflow = previousBodyOverflow;
    document.body.style.paddingRight = previousBodyPaddingRight;
  };
}, [open, onClose]);

  const modalTitle = open ? title : cachedTitle;
  const modalChildren = open ? children : cachedChildren;
  const modalTone = open ? tone : cachedTone;
  const modalSize = open ? size : cachedSize;

  const sizeClass = useMemo(() => {
    return modalSize === "md"
      ? "w-full max-w-xl"
      : modalSize === "lg"
        ? "w-full max-w-3xl"
        : "w-[75vw] max-w-none";
  }, [modalSize]);

  const headerClass =
    modalTone === "danger"
      ? "flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 p-4"
      : "flex items-center justify-between gap-3 border-b border-ui-border p-4";

  const titleClass =
    modalTone === "danger"
      ? "text-base font-semibold text-red-700"
      : "text-base font-semibold text-ui-text";

  const closeBtnClass =
    modalTone === "danger"
      ? "btn btn-sm border border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-700"
      : "btn btn-ghost btn-sm";

  function handleOverlayClick() {
    if (closeOnOverlay) onClose?.();
  }

  if (!isRendered) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out ${
        isVisible ? "bg-black/45 opacity-100" : "bg-black/0 opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={modalTitle || "Modal"}
      onClick={handleOverlayClick}
    >
      <div
        className={`${sizeClass} overflow-hidden rounded-xl border border-ui-border bg-ui-surface shadow-modal transition-opacity duration-300 ease-in-out ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{ willChange: "opacity" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={headerClass}>
          <h3 className={titleClass}>{modalTitle || ""}</h3>

          {showCloseButton ? (
            <button
              className={closeBtnClass}
              type="button"
              onClick={() => onClose?.()}
            >
              {closeLabel}
            </button>
          ) : null}
        </div>

        <div className="p-4">{modalChildren}</div>
      </div>
    </div>
  );
}