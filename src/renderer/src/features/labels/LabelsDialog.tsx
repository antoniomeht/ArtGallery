import { Bold, ChevronLeft, ChevronRight, Italic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Artwork } from "../../../../shared/artwork";
import {
  addElement,
  defaultLabelTemplate,
  LABEL_ELEMENT_KINDS,
  LABEL_PRESETS,
  labelLayout,
  labelTemplateSchema,
  removeElements,
  resizeTemplate,
  styleElements,
  type LabelElementKind,
  type LabelFont,
  type LabelSize,
  type LabelTemplate,
} from "../../../../shared/labels";
import type { PrintSource } from "../../../../shared/print";
import { useDimensionUnit } from "../../hooks/useDimensionUnit";
import { loadSourceArtworks } from "../print/printData";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import { KIND_LABELS } from "./labelBoxes";
import { LabelEditor } from "./LabelEditor";
import { OverflowProbe } from "./OverflowProbe";
import "../print/print.css";
import "./LabelsDialog.css";

const FONT_LABELS: Record<LabelFont, string> = {
  sans: "Sin serifa",
  serif: "Con serifa",
};

const CUSTOM = "custom";
const MIN_SIZE: LabelSize = { widthMm: 40, heightMm: 25 };

interface LabelsDialogProps {
  source: PrintSource;
  onClose: () => void;
  onSaved: (path: string) => void;
}

/** Label design on a canvas, shared by every label printed. */
export function LabelsDialog({ source, onClose, onSaved }: LabelsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [artworks, setArtworks] = useState<Artwork[] | null>(null);
  const [template, setTemplate] = useState<LabelTemplate>(() =>
    defaultLabelTemplate(LABEL_PRESETS[0]),
  );
  const [selected, setSelected] = useState<LabelElementKind[]>([]);
  /** The artwork shown on the canvas. */
  const [shownIndex, setShownIndex] = useState(0);
  const [overflowing, setOverflowing] = useState<number[]>([]);
  /** The size inputs as typed; the template follows once they are valid. */
  const [sizeDraft, setSizeDraft] = useState({
    widthMm: String(template.widthMm),
    heightMm: String(template.heightMm),
  });
  const [isSaving, setIsSaving] = useState(false);
  /** The design last saved here; the notice shows while nothing changed. */
  const [savedTemplate, setSavedTemplate] = useState<LabelTemplate | null>(
    null,
  );
  const designSaved = savedTemplate === template;
  const [failed, setFailed] = useState(false);
  const unit = useDimensionUnit();
  // Fixed when the dialog opens; parents may pass a new object on render.
  const [fixedSource] = useState(source);

  const exhibitionId =
    "exhibitionId" in fixedSource ? fixedSource.exhibitionId : null;

  useEffect(() => {
    dialogRef.current?.showModal();
    void loadSourceArtworks(fixedSource).then(setArtworks);
  }, [fixedSource]);

  // An exhibition opens with the design saved for it.
  useEffect(() => {
    if (!exhibitionId) return;
    void window.artGallery
      .getExhibition(exhibitionId)
      .then(({ labelTemplate }) => {
        if (!labelTemplate) return;
        setTemplate(labelTemplate);
        setSizeDraft({
          widthMm: String(labelTemplate.widthMm),
          heightMm: String(labelTemplate.heightMm),
        });
      });
  }, [exhibitionId]);

  const preset =
    LABEL_PRESETS.find(
      ({ widthMm, heightMm }) =>
        widthMm === template.widthMm && heightMm === template.heightMm,
    )?.id ?? CUSTOM;
  const valid = labelTemplateSchema.safeParse(template).success;
  const layout = labelLayout(template);
  const count = artworks?.length ?? 0;
  const sheets = layout.perSheet > 0 ? Math.ceil(count / layout.perSheet) : 0;
  const shown = new Set(template.elements.map(({ kind }) => kind));
  const artwork = artworks?.[Math.min(shownIndex, count - 1)];

  const selectedTexts = template.elements.filter(
    ({ kind }) => selected.includes(kind) && kind !== "image",
  );
  const textKinds = selectedTexts.map(({ kind }) => kind);
  const sizes = new Set(selectedTexts.map(({ fontSizePt }) => fontSizePt));
  const commonSize = sizes.size === 1 ? [...sizes][0] : undefined;
  const allBold =
    selectedTexts.length > 0 && selectedTexts.every((e) => e.bold);
  const allItalic =
    selectedTexts.length > 0 && selectedTexts.every((e) => e.italic);

  const remove = (kinds: readonly LabelElementKind[]) => {
    setTemplate((current) => removeElements(current, kinds));
    setSelected((current) => current.filter((kind) => !kinds.includes(kind)));
  };

  const toggle = (kind: LabelElementKind, checked: boolean) => {
    if (!checked) return remove([kind]);
    setTemplate((current) => addElement(current, kind));
    setSelected([kind]);
  };

  const resize = (size: LabelSize) => {
    setSizeDraft({
      widthMm: String(size.widthMm),
      heightMm: String(size.heightMm),
    });
    setTemplate((current) => resizeTemplate(current, size));
  };

  const typeSize = (dimension: keyof LabelSize, text: string) => {
    const draft = { ...sizeDraft, [dimension]: text };
    setSizeDraft(draft);
    const size = {
      widthMm: Number(draft.widthMm),
      heightMm: Number(draft.heightMm),
    };
    const fits = labelTemplateSchema
      .pick({ widthMm: true, heightMm: true })
      .safeParse(size).success;
    if (fits) setTemplate((current) => resizeTemplate(current, size));
  };

  const style = (change: Parameters<typeof styleElements>[2]) =>
    setTemplate((current) => styleElements(current, textKinds, change));

  async function saveDesign() {
    if (!exhibitionId) return;
    setFailed(false);
    try {
      await window.artGallery.saveLabelTemplate(exhibitionId, template);
      setSavedTemplate(template);
    } catch {
      setFailed(true);
    }
  }

  async function save() {
    setIsSaving(true);
    setFailed(false);
    try {
      if (exhibitionId) {
        await window.artGallery.saveLabelTemplate(exhibitionId, template);
      }
      const result = await window.artGallery.exportLabelsPdf(
        fixedSource,
        template,
      );
      if (result) onSaved(result.path);
      else setIsSaving(false);
    } catch {
      setFailed(true);
      setIsSaving(false);
    }
  }

  const overflowTitles = overflowing
    .slice(0, 3)
    .map((index) => artworks?.[index]?.title)
    .join(", ");

  return (
    <dialog
      ref={dialogRef}
      className="dialog dialog--wide labels-dialog__window"
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
              <legend className="field__label">Datos</legend>
              {LABEL_ELEMENT_KINDS.map((kind) => (
                <label key={kind} className="checkbox">
                  <input
                    type="checkbox"
                    checked={shown.has(kind)}
                    onChange={(event) => toggle(kind, event.target.checked)}
                  />
                  {KIND_LABELS[kind]}
                </label>
              ))}
            </fieldset>

            <label className="field">
              <span className="field__label">Fuente</span>
              <select
                className="field__input"
                value={template.font}
                onChange={(event) =>
                  setTemplate((current) => ({
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
              <span className="field__label">Tamaño</span>
              <select
                className="field__input"
                value={preset}
                onChange={(event) => {
                  const chosen = LABEL_PRESETS.find(
                    ({ id }) => id === event.target.value,
                  );
                  if (chosen) resize(chosen);
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
                    min={MIN_SIZE[dimension]}
                    value={sizeDraft[dimension]}
                    onChange={(event) =>
                      typeSize(dimension, event.target.value)
                    }
                  />
                </label>
              ))}
            </div>

            <label className="field">
              <span className="field__label">Margen (mm)</span>
              <input
                className="field__input"
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={template.marginMm}
                onChange={(event) => {
                  const marginMm = Number(event.target.value);
                  if (marginMm >= 0 && marginMm <= 30) {
                    setTemplate((current) => ({ ...current, marginMm }));
                  }
                }}
              />
            </label>

            <p className="labels-dialog__summary" aria-live="polite">
              {valid
                ? `${layout.perSheet} por hoja A4. ${count} ${count === 1 ? "cartela" : "cartelas"} en ${sheets} ${sheets === 1 ? "hoja" : "hojas"}.`
                : "Elige al menos un dato y un tamaño entre 40 × 25 mm y 190 × 277 mm."}
            </p>
          </div>

          <div className="labels-dialog__canvas">
            <div className="labels-dialog__toolbar">
              <IconButton
                aria-label="Obra anterior"
                disabled={shownIndex === 0}
                onClick={() => setShownIndex((index) => index - 1)}
              >
                <ChevronLeft aria-hidden size={16} />
              </IconButton>
              <span className="labels-dialog__position">
                Obra {Math.min(shownIndex + 1, count)} de {count}
              </span>
              <IconButton
                aria-label="Obra siguiente"
                disabled={shownIndex >= count - 1}
                onClick={() => setShownIndex((index) => index + 1)}
              >
                <ChevronRight aria-hidden size={16} />
              </IconButton>

              <div className="labels-dialog__style">
                <label className="labels-dialog__points">
                  <span>Tamaño (pt)</span>
                  <input
                    key={`${textKinds.join()}-${commonSize ?? ""}`}
                    className="field__input"
                    type="number"
                    min={4}
                    max={96}
                    step={0.5}
                    disabled={textKinds.length === 0}
                    defaultValue={commonSize}
                    onChange={(event) => {
                      const fontSizePt = Number(event.target.value);
                      if (fontSizePt >= 4 && fontSizePt <= 96) {
                        style({ fontSizePt });
                      }
                    }}
                  />
                </label>
                <IconButton
                  aria-label="Negrita"
                  aria-pressed={allBold}
                  disabled={textKinds.length === 0}
                  onClick={() => style({ bold: !allBold })}
                >
                  <Bold aria-hidden size={16} />
                </IconButton>
                <IconButton
                  aria-label="Cursiva"
                  aria-pressed={allItalic}
                  disabled={textKinds.length === 0}
                  onClick={() => style({ italic: !allItalic })}
                >
                  <Italic aria-hidden size={16} />
                </IconButton>
              </div>
            </div>

            {artwork && valid && unit ? (
              <LabelEditor
                artwork={artwork}
                template={template}
                unit={unit}
                selected={selected}
                onSelect={setSelected}
                onChange={setTemplate}
                onRemove={remove}
              />
            ) : (
              <div className="label-editor" />
            )}

            <p className="labels-dialog__hint">
              Arrastra los datos para moverlos y la esquina para cambiar su
              tamaño. Mayús+clic o un recuadro eligen varios; Supr los quita;
              las flechas los mueven 0,5 mm (con Mayús, 5 mm).
            </p>
            {overflowing.length > 0 && (
              <p className="labels-dialog__warning" role="status">
                El texto se sale de la cartela en {overflowing.length}{" "}
                {overflowing.length === 1 ? "obra" : "obras"}: {overflowTitles}
                {overflowing.length > 3 && "…"}.{" "}
                <button
                  type="button"
                  className="labels-dialog__see"
                  onClick={() => setShownIndex(overflowing[0] ?? 0)}
                >
                  Ver
                </button>
              </p>
            )}
          </div>
        </div>

        {artworks && unit && valid && (
          <OverflowProbe
            artworks={artworks}
            template={template}
            unit={unit}
            onResult={setOverflowing}
          />
        )}

        {failed && (
          <p className="dialog__error" role="alert">
            No se pudo generar el PDF. Inténtalo de nuevo.
          </p>
        )}
        <div className="dialog__actions">
          {designSaved && (
            <span className="labels-dialog__saved" role="status">
              Diseño guardado en la exposición.
            </span>
          )}
          <Button onClick={() => dialogRef.current?.close()}>Cancelar</Button>
          {exhibitionId && (
            <Button disabled={!valid || isSaving} onClick={saveDesign}>
              Guardar diseño
            </Button>
          )}
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
