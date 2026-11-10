import type { Section } from "../../components/Sidebar";
import "./drop.css";

/** Says where dropped files will go while they are dragged over the app. */
export function DropHint({ section }: { section: Section }) {
  return (
    <p className="drop-hint" aria-hidden>
      {section === "documents"
        ? "Suelta para añadirlos a Documentación."
        : "Suelta: las imágenes se añaden como obras y los demás archivos a Documentación. Sobre una obra, colección o exposición, para vincularlos."}
    </p>
  );
}
