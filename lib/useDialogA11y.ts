"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible-modal behavior for a custom dialog panel (WCAG 2.4.3, 2.1.2, 4.1.2):
 *  - moves focus into the panel on open and restores it to the trigger on close
 *  - traps Tab/Shift+Tab within the panel
 *  - closes on Escape
 *  - locks body scroll while open
 *
 * Pair with role="dialog" aria-modal="true" aria-labelledby={titleId} on the panel.
 */
export function useDialogA11y(open: boolean, onClose: () => void, panelRef: RefObject<HTMLElement>) {
  // Keep the latest onClose in a ref so the effect depends only on `open` — a
  // parent re-render (e.g. on every keystroke) must NOT re-run the effect, which
  // would steal focus back to the first field on every change.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const previouslyFocused = (typeof document !== "undefined" ? document.activeElement : null) as HTMLElement | null;

    const list = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    // Focus the first field/control (fall back to the panel itself).
    const first = list()[0];
    (first ?? panel)?.focus?.();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const els = list();
      if (els.length === 0) return;
      const firstEl = els[0];
      const lastEl = els[els.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, panelRef]);
}
