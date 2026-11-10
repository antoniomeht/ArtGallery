import { useEffect, useRef, useState } from "react";
import type { PageSetup } from "../../../../shared/pageSetup";
import { Button } from "../../components/Button";

const SIZE_LABELS = { A4: "A4", Letter: "Carta" } as const;
const ORIENTATION_LABELS = {
  portrait: "Vertical",
  landscape: "Horizontal",
} as const;
const MARGIN_LABELS = {
  normal: "Normales (2,5 cm)",
  narrow: "Estrechos (1,27 cm)",
  wide: "Anchos (3,8 cm)",
} as const;

export function pageSetupSummary(setup: PageSetup): string {
  return [
    SIZE_LABELS[setup.size],
    ORIENTATION_LABELS[setup.orientation].toLowerCase(),
    `márgenes ${MARGIN_LABELS[setup.margins].split(" ")[0]!.toLowerCase()}`,
    setup.pageNumbers ? "nº de página" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function Choice<T extends string>({
  legend,
  name,
  value,
  labels,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="page-setup__group">
      <legend className="field__label">{legend}</legend>
      <div className="segmented">
        {(Object.keys(labels) as T[]).map((option) => (
          <label key={option} className="segmented__option">
            <input
              type="radio"
              name={name}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {labels[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface PageSetupDialogProps {
  setup: PageSetup;
  onSave: (setup: PageSetup) => void;
  onClose: () => void;
}

/** Size, orientation, margins, header and page numbers, as in Word. */
export function PageSetupDialog({
  setup,
  onSave,
  onClose,
}: PageSetupDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(setup);
  const update = (changes: Partial<PageSetup>) =>
    setDraft((current) => ({ ...current, ...changes }));

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="page-setup-title"
      onClose={onClose}
    >
      <div className="dialog__body">
        <h2 id="page-setup-title" className="dialog__title">
          Diseño de página
        </h2>
        <Choice
          legend="Tamaño"
          name="size"
          value={draft.size}
          labels={SIZE_LABELS}
          onChange={(size) => update({ size })}
        />
        <Choice
          legend="Orientación"
          name="orientation"
          value={draft.orientation}
          labels={ORIENTATION_LABELS}
          onChange={(orientation) => update({ orientation })}
        />
        <Choice
          legend="Márgenes"
          name="margins"
          value={draft.margins}
          labels={MARGIN_LABELS}
          onChange={(margins) => update({ margins })}
        />
        <label className="field">
          <span className="field__label">Encabezado</span>
          <input
            className="field__input"
            maxLength={200}
            placeholder="Por ejemplo, el nombre de la galería"
            value={draft.header}
            onChange={(event) => update({ header: event.target.value })}
          />
          <span className="field__hint">
            Sale arriba en cada página del PDF y al imprimir.
          </span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={draft.pageNumbers}
            onChange={(event) => update({ pageNumbers: event.target.checked })}
          />
          Número de página al pie
        </label>
        <div className="dialog__actions">
          <Button onClick={() => dialogRef.current?.close()}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave(draft);
              dialogRef.current?.close();
            }}
          >
            Aplicar
          </Button>
        </div>
      </div>
    </dialog>
  );
}
