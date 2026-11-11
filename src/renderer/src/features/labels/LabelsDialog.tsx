import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Artwork } from "../../../../shared/artwork";
import {
  DEFAULT_LABEL_OPTIONS,
  LABEL_FIELDS,
  LABEL_PRESETS,
  type LabelFont,
  type LabelTextSize,
  labelLayout,
  labelOptionsSchema,
  type LabelField,
  type LabelOptions,
} from "../../../../shared/labels";
import type { PrintSource } from "../../../../shared/print";
import { useDimensionUnit } from "../../hooks/useDimensionUnit";
import { LabelCard } from "../print/LabelCard";
import { loadSourceArtworks } from "../print/printData";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import { moveItem } from "../exhibitions/reorder";
import "../print/print.css";
import "./LabelsDialog.css";

const FIELD_LABELS: Record<LabelField, string> = {
  artist: "Artista",
  title: "Título",
  year: "Año",
  medium: "Técnica y soporte",
  dimensions: "Dimensiones",
  price: "Precio",
};

const FONT_LABELS: Record<LabelFont, string> = {
  sans: "Sin serifa",
  serif: "Con serifa",
};

const TEXT_SIZE_LABELS: Record<LabelTextSize, string> = {
  small: "Pequeño",
  normal: "Normal",
  large: "Grande",
};

const CUSTOM = "custom";

interface LabelsDialogProps {
  source: PrintSource;
  onClose: () => void;
  onSaved: (path: string) => void;
}

/** Label options with a live preview of the first label. */
export function LabelsDialog({ source, onClose, onSaved }: LabelsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [artworks, setArtworks] = useState<Artwork[] | null>(null);
  const [options, setOptions] = useState<LabelOptions>(DEFAULT_LABEL_OPTIONS);
  /** Every datum in label order; `options.fields` holds the ticked ones. */
  const [order, setOrder] = useState<LabelField[]>(() => [
    ...DEFAULT_LABEL_OPTIONS.fields,
    ...LABEL_FIELDS.filter((f) => !DEFAULT_LABEL_OPTIONS.fields.includes(f)),
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const unit = useDimensionUnit();
  // Fixed when the dialog opens; parents may pass a new object on render.
  const [fixedSource] = useState(source);

  useEffect(() => {
    dialogRef.current?.showModal();
    void loadSourceArtworks(fixedSource).then(setArtworks);
  }, [fixedSource]);

  const preset =
    LABEL_PRESETS.find(
      ({ widthMm, heightMm }) =>
        widthMm === options.widthMm && heightMm === options.heightMm,
    )?.id ?? CUSTOM;
  const valid = labelOptionsSchema.safeParse(options).success;
  const layout = labelLayout(options);
  const count = artworks?.length ?? 0;
  const sheets = layout.perSheet > 0 ? Math.ceil(count / layout.perSheet) : 0;

  const toggleField = (field: LabelField, checked: boolean) =>
    setOptions((current) => ({
      ...current,
      fields: order.filter((item) =>
        item === field ? checked : current.fields.includes(item),
      ),
    }));

  const moveField = (index: number, offset: -1 | 1) => {
    const moved = moveItem(order, index, index + offset);
    setOrder(moved);
    setOptions((current) => ({
      ...current,
      fields: moved.filter((item) => current.fields.includes(item)),
    }));
  };

  async function save() {
    setIsSaving(true);
    setFailed(false);
    try {
      const result = await window.artGallery.exportLabelsPdf(
        fixedSource,
        options,
      );
      if (result) onSaved(result.path);
      else setIsSaving(false);
    } catch {
      setFailed(true);
      setIsSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog dialog--wide"
      aria-labelledby="labels-title"
      onClose={onClose}
    >
      <div className="dialog__body">
        <h2 id="labels-title" className="dialog__title">
          Cartelas
        </h2>

        <div className="labels-dialog">
          <div className="labels-dialog__options">
            <fieldset className="choice-list">
              <legend className="field__label">Datos y su orden</legend>
              {order.map((field, index) => (
                <div key={field} className="labels-dialog__field">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={options.fields.includes(field)}
                      onChange={(event) =>
                        toggleField(field, event.target.checked)
                      }
                    />
                    {FIELD_LABELS[field]}
                  </label>
                  <IconButton
                    aria-label={`Subir ${FIELD_LABELS[field]}`}
                    disabled={index === 0}
                    onClick={() => moveField(index, -1)}
                  >
                    <ArrowUp aria-hidden size={14} />
                  </IconButton>
                  <IconButton
                    aria-label={`Bajar ${FIELD_LABELS[field]}`}
                    disabled={index === order.length - 1}
                    onClick={() => moveField(index, 1)}
                  >
                    <ArrowDown aria-hidden size={14} />
                  </IconButton>
                </div>
              ))}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={options.showImage}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      showImage: event.target.checked,
                    }))
                  }
                />
                Imagen de la obra
              </label>
            </fieldset>

            <div className="artwork-form__row">
              <label className="field">
                <span className="field__label">Fuente</span>
                <select
                  className="field__input"
                  value={options.font}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      font: event.target.value as LabelFont,
                    }))
                  }
                >
                  {Object.entries(FONT_LABELS).map(([font, label]) => (
                    <option key={font} value={font}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field__label">Tamaño del texto</span>
                <select
                  className="field__input"
                  value={options.textSize}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      textSize: event.target.value as LabelTextSize,
                    }))
                  }
                >
                  {Object.entries(TEXT_SIZE_LABELS).map(([size, label]) => (
                    <option key={size} value={size}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span className="field__label">Tamaño</span>
              <select
                className="field__input"
                value={preset}
                onChange={(event) => {
                  const chosen = LABEL_PRESETS.find(
                    ({ id }) => id === event.target.value,
                  );
                  if (chosen) {
                    setOptions((current) => ({
                      ...current,
                      widthMm: chosen.widthMm,
                      heightMm: chosen.heightMm,
                    }));
                  }
                }}
              >
                {LABEL_PRESETS.map(({ id, name, widthMm, heightMm }) => (
                  <option key={id} value={id}>
                    {name} ({widthMm / 10} × {heightMm / 10} cm)
                  </option>
                ))}
                <option value={CUSTOM} disabled>
                  Personalizado
                </option>
              </select>
            </label>

            <div className="artwork-form__row">
              {(["widthMm", "heightMm"] as const).map((dimension) => (
                <label key={dimension} className="field">
                  <span className="field__label">
                    {dimension === "widthMm" ? "Ancho (mm)" : "Alto (mm)"}
                  </span>
                  <input
                    className="field__input"
                    type="number"
                    min={dimension === "widthMm" ? 40 : 25}
                    value={options[dimension]}
                    onChange={(event) =>
                      setOptions((current) => ({
                        ...current,
                        [dimension]: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              ))}
            </div>

            <p className="labels-dialog__summary" aria-live="polite">
              {valid
                ? `${layout.perSheet} por hoja A4. ${count} ${count === 1 ? "cartela" : "cartelas"} en ${sheets} ${sheets === 1 ? "hoja" : "hojas"}.`
                : "Elige al menos un dato y un tamaño entre 40 × 25 mm y 190 × 277 mm."}
            </p>
          </div>

          <div className="labels-dialog__preview" aria-label="Vista previa">
            {artworks?.[0] && valid && unit && (
              <LabelCard artwork={artworks[0]} options={options} unit={unit} />
            )}
          </div>
        </div>

        {failed && (
          <p className="dialog__error" role="alert">
            No se pudo generar el PDF. Inténtalo de nuevo.
          </p>
        )}
        <div className="dialog__actions">
          <Button onClick={() => dialogRef.current?.close()}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={!valid || count === 0 || isSaving}
            onClick={save}
          >
            {isSaving ? "Generando PDF…" : "Guardar PDF…"}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
