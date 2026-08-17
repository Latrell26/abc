import { useState, useId } from "react";

interface DisclosureProps {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function Disclosure({ label, children, defaultOpen = false }: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="disclosure">
      <button
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="disclosure-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {label}
        <span className="disclosure-icon" aria-hidden="true">
          ▶
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-label={label}
        hidden={!isOpen}
        className="disclosure-panel"
      >
        {children}
      </div>
    </div>
  );
}
