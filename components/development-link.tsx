"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

export function DevelopmentLink({ feature, description, children, className = "" }: { feature: string; description: string; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const descriptionId = useId();
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = previousOverflow; };
  }, [open]);
  return <>
    <button type="button" className={`development-link ${className}`} title={`${feature}: ${description}`} onClick={() => setOpen(true)}>{children}</button>
    {open && createPortal(<div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label={`${feature} — Still in Development`} aria-describedby={descriptionId} className="development-modal">
        <div className="development-icon">◇</div><span className="development-kicker">Coming soon</span><h2>{feature}</h2><strong>Still in Development</strong><p id={descriptionId}>{description}</p><p>We&apos;re building and testing this area before making it available to the team.</p><button type="button" autoFocus onClick={() => setOpen(false)}>Close</button>
      </section>
    </div>, document.body)}
  </>;
}
