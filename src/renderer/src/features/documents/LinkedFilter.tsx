import { X } from "lucide-react";
import { useEffect, useState } from "react";
import type { DocumentLinkRef } from "../../../../shared/document";

export type LinkedChoice = DocumentLinkRef & { label: string };

interface LinkedFilterProps {
  value: LinkedChoice | null;
  onChange: (value: LinkedChoice | null) => void;
}

interface Choices {
  exhibitions: LinkedChoice[];
  collections: LinkedChoice[];
}

/**
 * Filters by an exhibition or a collection. An artwork comes from its record
 * and shows as a bubble, since a list of every artwork would be too long.
 */
export function LinkedFilter({ value, onChange }: LinkedFilterProps) {
  const [choices, setChoices] = useState<Choices>({
    exhibitions: [],
    collections: [],
  });

  useEffect(() => {
    let isCurrent = true;
    void Promise.all([
      window.artGallery.listExhibitions(),
      window.artGallery.listCollections(),
    ]).then(([exhibitions, collections]) => {
      if (!isCurrent) return;
      setChoices({
        exhibitions: exhibitions.map(({ id, name }) => ({
          type: "exhibition",
          id,
          label: name,
        })),
        collections: collections.map(({ id, name }) => ({
          type: "collection",
          id,
          label: name,
        })),
      });
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  if (value?.type === "artwork") {
    return (
      <span className="filter-bubble">
        Obra: {value.label}
        <button
          type="button"
          className="filter-bubble__remove"
          aria-label={`Quitar filtro: obra ${value.label}`}
          onClick={() => onChange(null)}
        >
          <X aria-hidden size={14} />
        </button>
      </span>
    );
  }

  const all = [...choices.exhibitions, ...choices.collections];
  const key = (choice: LinkedChoice) => `${choice.type}:${choice.id}`;

  return (
    <label className="documents__linked-filter">
      <span className="visually-hidden">Vinculado a</span>
      <select
        className="field__input"
        value={value ? key(value) : ""}
        onChange={(event) =>
          onChange(
            all.find((choice) => key(choice) === event.target.value) ?? null,
          )
        }
      >
        <option value="">Vinculado a cualquier cosa</option>
        {choices.exhibitions.length > 0 && (
          <optgroup label="Exposiciones">
            {choices.exhibitions.map((choice) => (
              <option key={key(choice)} value={key(choice)}>
                {choice.label}
              </option>
            ))}
          </optgroup>
        )}
        {choices.collections.length > 0 && (
          <optgroup label="Colecciones">
            {choices.collections.map((choice) => (
              <option key={key(choice)} value={key(choice)}>
                {choice.label}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </label>
  );
}
