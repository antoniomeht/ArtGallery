import { useState, type FormEvent } from "react";
import {
  ARTWORK_STATUSES,
  DIMENSION_UNITS,
  type Artwork,
} from "../../../../shared/artwork";
import { STATUS_LABELS } from "../../../../shared/artworkFormat";
import { Field } from "../../components/Field";
import {
  parseFormValues,
  toFormValues,
  type ArtworkFormErrors,
  type ArtworkFormValues,
} from "./artworkFormValues";
import { Button } from "../../components/Button";

const CATEGORY_SUGGESTIONS = [
  "Pintura",
  "Dibujo",
  "Grabado",
  "Fotografía",
  "Técnica mixta",
];

interface ArtworkFormProps {
  artwork: Artwork;
  /** A new artwork: its title is ready to be typed over, and it can be discarded. */
  isUnsaved: boolean;
  onCancel: () => void;
  onSaved: (artwork: Artwork) => void;
}

export function ArtworkForm({
  artwork,
  isUnsaved,
  onCancel,
  onSaved,
}: ArtworkFormProps) {
  const [values, setValues] = useState(() => toFormValues(artwork));
  const [errors, setErrors] = useState<ArtworkFormErrors>({});
  const [saveError, setSaveError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /** Props for a text input bound to `name`. */
  const bind = (name: keyof ArtworkFormValues) => ({
    value: values[name] as string,
    error: errors[name],
    onChange: (value: string) =>
      setValues((current) => ({ ...current, [name]: value })),
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseFormValues(values);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setSaveError(false);
    setIsSaving(true);
    try {
      onSaved(await window.artGallery.updateArtwork(artwork.id, parsed.fields));
    } catch {
      setSaveError(true);
      setIsSaving(false);
    }
  }

  return (
    <form className="artwork-form" onSubmit={handleSubmit} noValidate>
      <h2 className="artwork-form__title">Editar ficha</h2>

      <Field
        label="Título"
        required
        autoFocus
        onFocus={isUnsaved ? (event) => event.target.select() : undefined}
        {...bind("title")}
      />
      <Field label="Artista" {...bind("artist")} />

      <div className="artwork-form__row">
        <Field
          label="Categoría"
          list="category-suggestions"
          {...bind("category")}
        />
        <datalist id="category-suggestions">
          {CATEGORY_SUGGESTIONS.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <label className="field">
          <span className="field__label">Estado</span>
          <select
            className="field__input"
            value={values.status}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                status: event.target.value as Artwork["status"],
              }))
            }
          >
            {ARTWORK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="artwork-form__row">
        <Field label="Técnica" {...bind("technique")} />
        <Field label="Soporte" {...bind("support")} />
      </div>

      <fieldset className="artwork-form__group">
        <legend className="field__label">Año</legend>
        <div className="artwork-form__row">
          <Field label="Año" hideLabel inputMode="numeric" {...bind("year")} />
          <label className="checkbox">
            <input
              type="checkbox"
              checked={values.yearApproximate}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  yearApproximate: event.target.checked,
                }))
              }
            />
            Fecha aproximada
          </label>
        </div>
      </fieldset>

      <fieldset className="artwork-form__group">
        <legend className="field__label">Dimensiones</legend>
        <div className="artwork-form__row artwork-form__row--dimensions">
          <Field label="Alto" inputMode="decimal" {...bind("height")} />
          <Field label="Ancho" inputMode="decimal" {...bind("width")} />
          <Field label="Profundidad" inputMode="decimal" {...bind("depth")} />
          <label className="field">
            <span className="field__label">Unidad</span>
            <select
              className="field__input"
              value={values.dimensionUnit}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  dimensionUnit: event.target.value as Artwork["dimensionUnit"],
                }))
              }
            >
              {DIMENSION_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <Field label="Ubicación" {...bind("location")} />
      <Field label="Etiquetas" hint="separadas por comas" {...bind("tags")} />

      <div className="artwork-form__row">
        <Field label="Precio" inputMode="decimal" {...bind("price")} />
        <Field label="Moneda" maxLength={3} {...bind("currency")} />
      </div>

      <Field label="Descripción" multiline {...bind("description")} />
      <Field label="Notas" multiline {...bind("notes")} />

      {Object.keys(errors).length > 0 && (
        <p className="artwork-form__error" role="alert">
          Hay campos por revisar.
        </p>
      )}
      {saveError && (
        <p className="artwork-form__error" role="alert">
          No se pudieron guardar los cambios. Inténtalo de nuevo.
        </p>
      )}

      <div className="artwork-form__actions">
        <Button onClick={onCancel}>
          {isUnsaved ? "Descartar" : "Cancelar"}
        </Button>
        <Button type="submit" variant="primary" disabled={isSaving}>
          {isSaving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
