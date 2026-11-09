import { useEffect, useState, type FormEvent } from "react";
import {
  ARTWORK_STATUSES,
  DIMENSION_UNITS,
  type Artwork,
  type FilterOptions,
} from "../../../../shared/artwork";
import { STATUS_LABELS } from "../../../../shared/artworkFormat";
import { Field } from "../../components/Field";
import {
  parseFormValues,
  toFormValues,
  type ArtworkFormErrors,
  type ArtworkFormValues,
} from "./artworkFormValues";
import { SuggestField } from "./SuggestField";
import { useDefaultArtistOffer } from "./useDefaultArtistOffer";
import { withDefaults } from "./suggestions";
import { Button } from "../../components/Button";

/** Offered from the first artwork, when the inventory has no values yet. */
const COMMON_CATEGORIES = [
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
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const defaultArtist = useDefaultArtistOffer(values.artist);

  useEffect(() => {
    // Without suggestions the fields still work, so a failure is not shown.
    window.artGallery.listFilterOptions().then(setOptions, () => {});
  }, []);

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
      const saved = await window.artGallery.updateArtwork(
        artwork.id,
        parsed.fields,
      );
      // The artwork is already saved; a missing default is only an extra.
      await defaultArtist.apply(saved.artist).catch(() => {});
      onSaved(saved);
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
      <SuggestField
        label="Artista"
        suggestions={options?.artists ?? []}
        {...bind("artist")}
      />
      {defaultArtist.isOffered && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={defaultArtist.isChosen}
            onChange={(event) =>
              defaultArtist.setIsChosen(event.target.checked)
            }
          />
          Usar como artista predeterminado
        </label>
      )}

      <div className="artwork-form__row">
        <SuggestField
          label="Categoría"
          suggestions={withDefaults(
            options?.categories ?? [],
            COMMON_CATEGORIES,
          )}
          {...bind("category")}
        />
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
        <SuggestField
          label="Técnica"
          suggestions={options?.techniques ?? []}
          {...bind("technique")}
        />
        <SuggestField
          label="Soporte"
          suggestions={options?.supports ?? []}
          {...bind("support")}
        />
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

      <SuggestField
        label="Ubicación"
        suggestions={options?.locations ?? []}
        {...bind("location")}
      />
      <SuggestField
        label="Etiquetas"
        hint="separadas por comas"
        isList
        suggestions={options?.tags ?? []}
        {...bind("tags")}
      />

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
