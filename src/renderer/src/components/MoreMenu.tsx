import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { useId, type CSSProperties } from "react";

export interface MoreMenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void | Promise<unknown>;
}

interface MoreMenuProps {
  /** Accessible name of the button, e.g. "Más acciones del documento". */
  label: string;
  items: MoreMenuItem[];
}

/** Less frequent actions behind a "⋯" button, in a popover menu. */
export function MoreMenu({ label, items }: MoreMenuProps) {
  const id = useId();
  const anchor = `--more-${id.replace(/\W/g, "")}`;

  return (
    <>
      <button
        type="button"
        className="icon-button more-menu__button"
        aria-label={label}
        title={label}
        popoverTarget={id}
        style={{ anchorName: anchor } as CSSProperties}
      >
        <MoreHorizontal aria-hidden size={18} />
      </button>
      <div
        id={id}
        popover="auto"
        role="menu"
        className="filter-panel menu"
        style={{ positionAnchor: anchor } as CSSProperties}
      >
        {items.map(({ label: itemLabel, icon: Icon, onSelect }) => (
          <button
            key={itemLabel}
            type="button"
            role="menuitem"
            className="menu__item more-menu__item"
            onClick={() => {
              document.getElementById(id)?.hidePopover();
              void onSelect();
            }}
          >
            {Icon && <Icon aria-hidden size={16} />}
            {itemLabel}
          </button>
        ))}
      </div>
    </>
  );
}
