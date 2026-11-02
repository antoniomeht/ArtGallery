import {
  ArrowLeftRight,
  HardDriveDownload,
  Images,
  Search,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import "./Sidebar.css";

export type Section = "gallery" | "search" | "transfer" | "backups" | "trash";

const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "gallery", label: "Galería", icon: Images },
  { id: "search", label: "Búsqueda y filtros", icon: Search },
  { id: "transfer", label: "Exportación e importación", icon: ArrowLeftRight },
  { id: "backups", label: "Copias y ajustes", icon: HardDriveDownload },
];

/** Shown apart, at the bottom, so it does not compete with daily sections. */
const TRASH = { id: "trash", label: "Papelera", icon: Trash2 } as const;

interface SidebarProps {
  current: Section;
  onNavigate: (section: Section) => void;
}

export function Sidebar({ current, onNavigate }: SidebarProps) {
  const renderLink = ({ id, label, icon: Icon }: (typeof SECTIONS)[number]) => (
    <li key={id}>
      <button
        type="button"
        className="sidebar__link"
        aria-current={current === id ? "page" : undefined}
        onClick={() => onNavigate(id)}
      >
        <Icon aria-hidden size={18} strokeWidth={1.75} />
        {label}
      </button>
    </li>
  );

  return (
    <nav className="sidebar" aria-label="Secciones">
      <p className="sidebar__brand">ArtGallery</p>
      <ul className="sidebar__list">{SECTIONS.map(renderLink)}</ul>
      <ul className="sidebar__list sidebar__list--end">{renderLink(TRASH)}</ul>
    </nav>
  );
}
