import { ChevronDown, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

type DisclosureSectionProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  icon: LucideIcon;
  title: string;
  variant?: "inspector" | "tools";
};

export function DisclosureSection({
  children,
  defaultOpen = false,
  icon: Icon,
  title,
  variant = "tools",
}: DisclosureSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className={`disclosure-section ${variant === "tools" ? "tool-section" : "inspector-disclosure"}`}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span className="disclosure-label">
          <Icon aria-hidden="true" size={15} />
          {title}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="disclosure-chevron"
          size={15}
        />
      </summary>
      <div className="disclosure-content">{children}</div>
    </details>
  );
}
