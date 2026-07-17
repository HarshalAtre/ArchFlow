import type { LucideIcon } from "lucide-react";

export type CreationPickerItem<T extends string> = {
  description: string;
  icon: LucideIcon;
  id: T;
  label: string;
  tone: "amber" | "blue" | "cyan" | "green" | "magenta" | "red" | "yellow";
};

type CreationPickerProps<T extends string> = {
  disabled?: boolean;
  items: CreationPickerItem<T>[];
  onSelect: (id: T) => void;
};

export function CreationPicker<T extends string>({
  disabled = false,
  items,
  onSelect,
}: CreationPickerProps<T>) {
  return (
    <div className="creation-picker">
      {items.map(({ description, icon: Icon, id, label, tone }) => (
        <button
          key={id}
          className="creation-picker-button"
          data-tone={tone}
          disabled={disabled}
          type="button"
          onClick={() => onSelect(id)}
        >
          <span className="creation-picker-icon" aria-hidden="true">
            <Icon size={20} strokeWidth={1.8} />
          </span>
          <span className="creation-picker-copy">
            <strong>{label}</strong>
            <small>{description}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
