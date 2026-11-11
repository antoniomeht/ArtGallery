import { Plus, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
  numberRangesSchema,
  type NumberRanges,
} from "../../../../shared/inventoryNumbers";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";

interface NumberRangesSectionProps {
  value: NumberRanges;
  onSave: (numberRanges: NumberRanges) => Promise<void>;
}

/** Rows as typed, before they are checked. */
type Draft = { technique: string; from: string; to: string }[];

const toDraft = (ranges: NumberRanges): Draft =>
  ranges.map(({ technique, from, to }) => ({
    technique,
    from: String(from),
    to: String(to),
  }));

/** Inventory numbers kept for each technique. */
export function NumberRangesSection({
  value,
  onSave,
}: NumberRangesSectionProps) {
  const listId = useId();
  const [draft, setDraft] = useState(() => toDraft(value));
  const [techniques, setTechniques] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "invalid" | "saved">("idle");

  useEffect(() => {
    window.artGallery.listFilterOptions().then(
      ({ techniques: used }) => setTechniques(used),
      () => {},
    );
  }, []);

  const change = (index: number, key: keyof Draft[number], text: string) => {
    setStatus("idle");
    setDraft((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [key]: text } : row)),
    );
  };

  async function save() {
    // Rows left completely blank are dropped; the others must be whole.
    const rows = draft.filter(
      (row) => row.technique.trim() || row.from || row.to,
    );
    const parsed = numberRangesSchema.safeParse(
      rows.map((row) => ({
        technique: row.technique,
        from: Number(row.from),
        to: Number(row.to),
      })),
    );
    const isWhole = (text: string) => /^\d+$/.test(text);
    if (
      !parsed.success ||
      rows.some((row) => !isWhole(row.from) || !isWhole(row.to))
    ) {
      setStatus("invalid");
      return;
    }
    await onSave(parsed.data);
    setDraft(toDraft(parsed.data));
    setStatus("saved");
  }

  return (
    <section className="page-section" aria-labelledby="number-ranges">
      <h2 id="number-ranges" className="page-section__title">
        Numeración por técnica
      </h2>
      <p className="page-section__hint">
        Al guardar una obra sin número de inventario, toma el primer número
        libre del rango de su técnica, por ejemplo 001. Siempre se puede cambiar
        a mano.
      </p>
      <datalist id={listId}>
        {techniques.map((technique) => (
          <option key={technique} value={technique} />
        ))}
      </datalist>
      {draft.length > 0 && (
        <table className="number-ranges">
          <thead>
            <tr>
              <th scope="col">Técnica</th>
              <th scope="col">Desde</th>
              <th scope="col">Hasta</th>
              <th scope="col">
                <span className="visually-hidden">Quitar</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {draft.map((row, index) => (
              <tr key={index}>
                <td>
                  <input
                    className="field__input"
                    list={listId}
                    aria-label="Técnica"
                    value={row.technique}
                    onChange={(event) =>
                      change(index, "technique", event.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    className="field__input number-ranges__number"
                    inputMode="numeric"
                    aria-label={`Desde, ${row.technique || "rango"}`}
                    value={row.from}
                    onChange={(event) =>
                      change(index, "from", event.target.value.trim())
                    }
                  />
                </td>
                <td>
                  <input
                    className="field__input number-ranges__number"
                    inputMode="numeric"
                    aria-label={`Hasta, ${row.technique || "rango"}`}
                    value={row.to}
                    onChange={(event) =>
                      change(index, "to", event.target.value.trim())
                    }
                  />
                </td>
                <td>
                  <IconButton
                    aria-label={`Quitar el rango de ${row.technique || "esta técnica"}`}
                    onClick={() => {
                      setStatus("idle");
                      setDraft((rows) => rows.filter((_, i) => i !== index));
                    }}
                  >
                    <X aria-hidden size={16} />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {status === "invalid" && (
        <p className="dialog__error" role="alert">
          Cada rango necesita una técnica y dos números enteros, y «Hasta» no
          puede ser menor que «Desde».
        </p>
      )}
      <div className="page-section__actions">
        <Button
          onClick={() => {
            setStatus("idle");
            setDraft((rows) => [...rows, { technique: "", from: "", to: "" }]);
          }}
        >
          <Plus aria-hidden size={16} />
          Añadir rango
        </Button>
        <Button variant="primary" onClick={() => void save()}>
          Guardar rangos
        </Button>
        {status === "saved" && <span role="status">Guardado.</span>}
      </div>
    </section>
  );
}
