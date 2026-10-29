import { Images } from "lucide-react";
import "./Sidebar.css";

export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Secciones">
      <p className="sidebar__brand">ArtGallery</p>
      <ul className="sidebar__list">
        <li>
          <a className="sidebar__link" href="#galeria" aria-current="page">
            <Images aria-hidden size={18} strokeWidth={1.75} />
            Galería
          </a>
        </li>
      </ul>
    </nav>
  );
}
