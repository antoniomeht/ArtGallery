import type { Artwork } from "../../../../shared/artwork";
import {
  formatDimensions,
  type DimensionUnit,
} from "../../../../shared/dimensions";
import {
  formatMedium,
  formatPrice,
  formatYear,
  STATUS_LABELS,
} from "../../../../shared/artworkFormat";
import {
  hiddenFieldsFor,
  shownFields,
  type HiddenFields,
} from "../../../../shared/categoryFields";

interface ArtworkLabelProps {
  artwork: Artwork;
  unit: DimensionUnit;
  /** Fields the artwork's category leaves out; their values are kept. */
  hiddenFields: HiddenFields;
  /** Called with the form label of a field the user clicks, e.g. "Técnica". */
  onEditField?: (fieldLabel: string) => void;
}

/**
 * Read-only record laid out like a museum wall label, then the details.
 * Clicking a value opens it for editing; the "Editar" button does the same
 * from the keyboard.
 */
export function ArtworkLabel({
  artwork: stored,
  unit,
  hiddenFields,
  onEditField,
}: ArtworkLabelProps) {
  const editable = (fieldLabel: string) =>
    onEditField
      ? {
          "data-edit": fieldLabel,
          className: "label__editable",
          title: "Haz clic para editar",
        }
      : {};
  const hidden = hiddenFieldsFor(stored.category, hiddenFields);
  const artwork = shownFields(stored, hidden);
  const medium = formatMedium(artwork);
  const dimensions = hidden.has("dimensions")
    ? null
    : formatDimensions(artwork.dimensions, unit);
  const details: [string, string | null][] = [
    ["Nº de inventario", artwork.inventoryNumber],
    ["Categoría", artwork.category],
    ["Estado", hidden.has("status") ? null : STATUS_LABELS[artwork.status]],
    ["Ubicación", artwork.location],
    ["Precio", formatPrice(artwork)],
  ];

  return (
    <article
      className="label"
      onClick={(event) => {
        // Selecting text to copy it must not open the form.
        if (window.getSelection()?.toString()) return;
        const target = (event.target as Element).closest<HTMLElement>(
          "[data-edit]",
        );
        if (target?.dataset.edit) onEditField?.(target.dataset.edit);
      }}
    >
      <header className="label__heading">
        {artwork.artist && (
          <p
            {...editable("Artista")}
            className={`label__artist${onEditField ? " label__editable" : ""}`}
          >
            {artwork.artist}
          </p>
        )}
        <h2 className="label__title">
          <span {...editable("Título")}>
            <span className="artwork-title">{artwork.title}</span>
          </span>
          {formatYear(artwork) && (
            <span {...editable("Año")}>, {formatYear(artwork)}</span>
          )}
        </h2>
        {medium && <p {...editable("Técnica")}>{medium}</p>}
        {dimensions && <p {...editable("Alto")}>{dimensions}</p>}
      </header>

      <dl className="label__details">
        {details
          .filter(([, value]) => value)
          .map(([term, value]) => (
            <div
              key={term}
              {...editable(term)}
              className={`label__detail${onEditField ? " label__editable" : ""}`}
            >
              <dt>{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>

      {artwork.tags.length > 0 && (
        <ul
          aria-label="Etiquetas"
          {...editable("Etiquetas")}
          className={`label__tags${onEditField ? " label__editable" : ""}`}
        >
          {artwork.tags.map((tag) => (
            <li key={tag} className="tag">
              {tag}
            </li>
          ))}
        </ul>
      )}

      {artwork.description && (
        <section
          {...editable("Descripción")}
          className={`label__text${onEditField ? " label__editable" : ""}`}
        >
          <h3>Descripción</h3>
          <p>{artwork.description}</p>
        </section>
      )}

      {artwork.notes && (
        <section
          {...editable("Notas")}
          className={`label__text${onEditField ? " label__editable" : ""}`}
        >
          <h3>Notas</h3>
          <p>{artwork.notes}</p>
        </section>
      )}
    </article>
  );
}
