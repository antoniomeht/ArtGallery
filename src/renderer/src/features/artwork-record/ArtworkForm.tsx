import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type Ref,
} from "react";
import {
  ARTWORK_STATUSES,
  type Artwork,
  type FilterOptions,
} from "../../../../shared/artwork";
import {
  AXIS_LABELS,
  formatDimensions,
  MEASURE_AXES,
  withEnteredMeasures,
  type DimensionUnit,
} from "../../../../shared/dimensions";
import { STATUS_LABELS } from "../../../../shared/artworkFormat";
import {
  COMMON_CATEGORIES,
  hiddenFieldsFor,
  type HiddenFields,
  type OptionalField,
} from "../../../../shared/categoryFields";
import { Field } from "../../components/Field";
import {
  enteredMeasures,
  parseFormValues,
  saveFailureErrors,
  toFormValues,
  type ArtworkFormErrors,
  type ArtworkFormValues,
} from "./artworkFormValues";
import { nextField } from "./formNavigation";
import { SuggestField } from "./SuggestField";
import { useDefaultArtistOffer } from "./useDefaultArtistOffer";
import { withDefaults } from "./suggestions";
import { Button } from "../../components/Button";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

/** Lets the record save the form before moving to another artwork. */
export interface ArtworkFormHandle {
  /** Saves what changed; false when a field needs fixing or saving failed. */
  saveChanges: () => Promise<boolean>;
}

interface ArtworkFormProps {
  handle?: Ref<ArtworkFormHandle>;
  artwork: Artwork;
  /** The unit measures are shown and typed in. */
  unit: DimensionUnit;
  /** Fields each category leaves out; they follow the category typed. */
  hiddenFields: HiddenFields;
  /** A new artwork: its title is ready to be typed over, and it can be discarded. */
  isUnsaved: boolean;
  /** Label of the field to start on, e.g. "Técnica"; the title otherwise. */
  focusField?: string;
  onCancel: () => void;
  onSaved: (artwork: Artwork) => void;
}

export function ArtworkForm({
  handle,
  artwork,
  unit,
  hiddenFields,
  isUnsaved,
  focusField,
  onCancel,
  onSaved,
}: ArtworkFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // Opened by clicking a value: the cursor goes to the end of that field.
  useEffect(() => {
    if (!focusField) return;
    const label = [...(formRef.current?.querySelectorAll("label") ?? [])].find(
      (candidate) => candidate.textContent?.trim().startsWith(focusField),
    );
    const control = label?.control;
    if (!control) return;
    control.focus();
    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement
    ) {
      const end = control.value.length;
      control.setSelectionRange(end, end);
    }
  }, [focusField]);
  const [initialValues] = useState(() => toFormValues(artwork, unit));
  const [values, setValues] = useState(initialValues);
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

  const hidden = hiddenFieldsFor(values.category, hiddenFields);
  const shows = (field: OptionalField) => !hidden.has(field);

  // Shows the number a blank field will take, following the technique.
  const technique = useDebouncedValue(values.technique.trim(), 300);
  const [suggestion, setSuggestion] = useState<{
    technique: string;
    number: string | null;
  } | null>(null);
  useEffect(() => {
    if (!technique) return;
    let isCurrent = true;
    window.artGallery.nextInventoryNumber(technique).then(
      (number) => isCurrent && setSuggestion({ technique, number }),
      () => {},
    );
    return () => {
      isCurrent = false;
    };
  }, [technique]);
  const suggestedNumber =
    technique && suggestion?.technique === technique ? suggestion.number : null;

  const otherUnit = unit === "cm" ? "in" : "cm";
  const equivalent = formatDimensions(
    withEnteredMeasures(artwork.dimensions, unit, enteredMeasures(values)),
    otherUnit,
  );

  /** The saved artwork, or null when nothing could be saved. */
  /** A blank number takes the next one of the technique's range. */
  async function withInventoryNumber(): Promise<ArtworkFormValues> {
    if (values.inventoryNumber.trim() || !values.technique.trim()) {
      return values;
    }
    const next = await window.artGallery
      .nextInventoryNumber(values.technique)
      .catch(() => null);
    return next ? { ...values, inventoryNumber: next } : values;
  }

  async function save(): Promise<Artwork | null> {
    const parsed = parseFormValues(
      await withInventoryNumber(),
      unit,
      artwork.dimensions,
    );
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return null;
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
      return saved;
    } catch (error) {
      const fieldErrors = saveFailureErrors(error);
      if (fieldErrors) setErrors(fieldErrors);
      else setSaveError(true);
      setIsSaving(false);
      return null;
    }
  }

  useImperativeHandle(handle, () => ({
    saveChanges: async () =>
      (JSON.stringify(values) === JSON.stringify(initialValues) &&
        !isUnsaved) ||
      (await save()) !== null,
  }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const saved = await save();
    if (saved) onSaved(saved);
  }

  /** Enter moves to the next field and Ctrl+Enter saves. */
  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    const { target } = event;
    if (event.key !== "Enter" || event.defaultPrevented) return;
    if (event.nativeEvent.isComposing) return;
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      formRef.current?.requestSubmit();
      return;
    }
    // Descriptions and notes keep their line breaks.
    if (!(
      target instanceof HTMLInputElement || target instanceof HTMLSelectElement
    ))
      return;
    event.preventDefault();
    const fields = [...(formRef.current?.elements ?? [])].filter(
      (element): element is HTMLElement =>
        (element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement) &&
        !element.disabled,
    );
    nextField(fields, target)?.focus();
  }

  return (
    <form
      ref={formRef}
      className="artwork-form"
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      noValidate
    >
      <h2 className="artwork-form__title">Editar ficha</h2>

      <Field
        label="Título"
        required
        autoFocus
        onFocus={isUnsaved ? (event) => event.target.select() : undefined}
        {...bind("title")}
      />
      <Field
        label="Nº de inventario"
        maxLength={30}
        placeholder={
          suggestedNumber ? `${suggestedNumber} (se asigna al guardar)` : ""
        }
        {...bind("inventoryNumber")}
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
        {shows("status") && (
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
        )}
      </div>

      {(shows("technique") || shows("support")) && (
        <div className="artwork-form__row">
          {shows("technique") && (
            <SuggestField
              label="Técnica"
              suggestions={options?.techniques ?? []}
              {...bind("technique")}
            />
          )}
          {shows("support") && (
            <SuggestField
              label="Soporte"
              suggestions={options?.supports ?? []}
              {...bind("support")}
            />
          )}
        </div>
      )}

      {shows("year") && (
        <fieldset className="artwork-form__group">
          <legend className="field__label">Año</legend>
          <div className="artwork-form__row">
            <Field
              label="Año"
              hideLabel
              inputMode="numeric"
              {...bind("year")}
            />
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
      )}

      {shows("dimensions") && (
        <fieldset className="artwork-form__group">
          <legend className="field__label">Dimensiones ({unit})</legend>
          <div className="artwork-form__row artwork-form__row--dimensions">
            {MEASURE_AXES.map((axis) => (
              <Field
                key={axis}
                label={AXIS_LABELS[axis]}
                inputMode="decimal"
                {...bind(axis)}
              />
            ))}
          </div>
          <p className="artwork-form__hint">
            {equivalent && `Equivale a ${equivalent}. `}La unidad se cambia en
            Ajustes.
          </p>
        </fieldset>
      )}

      {shows("location") && (
        <SuggestField
          label="Ubicación"
          suggestions={options?.locations ?? []}
          {...bind("location")}
        />
      )}
      {shows("tags") && (
        <SuggestField
          label="Etiquetas"
          hint="separadas por comas"
          isList
          suggestions={options?.tags ?? []}
          {...bind("tags")}
        />
      )}

      {shows("price") && (
        <div className="artwork-form__row">
          <Field label="Precio" inputMode="decimal" {...bind("price")} />
          <Field label="Moneda" maxLength={3} {...bind("currency")} />
        </div>
      )}

      {shows("description") && (
        <Field label="Descripción" multiline {...bind("description")} />
      )}
      {shows("notes") && <Field label="Notas" multiline {...bind("notes")} />}

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
        <span className="artwork-form__keys">
          Intro: siguiente campo · Ctrl+Intro: guardar · Alt+← / Alt+→: guardar
          y cambiar de obra
        </span>
        <label className="checkbox artwork-form__review">
          <input
            type="checkbox"
            checked={values.needsReview}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                needsReview: event.target.checked,
              }))
            }
          />
          Por revisar
        </label>
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
