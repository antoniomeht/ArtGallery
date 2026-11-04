import { ChevronDown } from "lucide-react";
import { useId, type CSSProperties, type ReactNode } from "react";

interface FilterDropdownProps {
  label: string;
  /** How many values are chosen; 0 shows the filter dimmed. */
  count: number;
  /** Shows the number of chosen values; a range counts as one and hides it. */
  showCount?: boolean;
  children: ReactNode;
}

/**
 * A filter button with a panel. The browser's popover gives keyboard handling,
 * closing on Escape or on a click elsewhere, and placement next to the button.
 */
export function FilterDropdown({
  label,
  count,
  showCount = true,
  children,
}: FilterDropdownProps) {
  const id = useId();
  const anchor = `--filter-${id.replace(/\W/g, "")}`;

  return (
    <>
      <button
        type="button"
        className={`filter-button${count > 0 ? " filter-button--active" : ""}`}
        popoverTarget={id}
        style={{ anchorName: anchor } as CSSProperties}
      >
        {label}
        {showCount && count > 0 && (
          <span className="filter-button__count">{count}</span>
        )}
        <ChevronDown aria-hidden size={14} />
      </button>
      <div
        id={id}
        popover="auto"
        className="filter-panel"
        style={{ positionAnchor: anchor } as CSSProperties}
      >
        {children}
      </div>
    </>
  );
}
