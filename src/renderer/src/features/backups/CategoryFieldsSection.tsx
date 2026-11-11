import { useEffect, useState } from "react";
import {
  COMMON_CATEGORIES,
  hiddenFieldsFor,
  OPTIONAL_FIELD_LABELS,
  OPTIONAL_FIELDS,
  withFieldShown,
  type HiddenFields,
} from "../../../../shared/categoryFields";
import { foldText } from "../../../../shared/text";

interface CategoryFieldsSectionProps {
  value: HiddenFields;
  onChange: (hiddenFields: HiddenFields) => void;
}

/** One name per category, keeping the first spelling found. */
function distinctCategories(names: readonly string[]): string[] {
  const seen = new Map<string, string>();
  for (const name of names) {
    const key = foldText(name);
    if (key && !seen.has(key)) seen.set(key, name.trim());
  }
  return [...seen.values()];
}

/** Which form fields each category shows. */
export function CategoryFieldsSection({
  value,
  onChange,
}: CategoryFieldsSectionProps) {
  const [used, setUsed] = useState<string[]>([]);

  useEffect(() => {
    // Without the inventory's categories the common ones are still listed.
    window.artGallery.listFilterOptions().then(
      ({ categories }) => setUsed(categories),
      () => {},
    );
  }, []);

  const categories = distinctCategories([
    ...Object.keys(value),
    ...used,
    ...COMMON_CATEGORIES,
  ]);

  return (
    <section className="page-section" aria-labelledby="category-fields">
      <h2 id="category-fields" className="page-section__title">
        Campos por categoría
      </h2>
      <p className="page-section__hint">
        Los campos sin marcar no aparecen en la ficha de las obras de esa
        categoría. Lo que ya tuvieran escrito se conserva. Título, artista y
        categoría se muestran siempre.
      </p>
      <div className="category-fields">
        <table className="category-fields__table">
          <thead>
            <tr>
              <th scope="col">Categoría</th>
              {OPTIONAL_FIELDS.map((field) => (
                <th key={field} scope="col">
                  {OPTIONAL_FIELD_LABELS[field]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const hidden = hiddenFieldsFor(category, value);
              return (
                <tr key={category}>
                  <th scope="row">{category}</th>
                  {OPTIONAL_FIELDS.map((field) => (
                    <td key={field}>
                      <input
                        type="checkbox"
                        aria-label={`${OPTIONAL_FIELD_LABELS[field]} en ${category}`}
                        checked={!hidden.has(field)}
                        onChange={(event) =>
                          onChange(
                            withFieldShown(
                              value,
                              category,
                              field,
                              event.target.checked,
                            ),
                          )
                        }
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
