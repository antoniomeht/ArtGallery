import { FileDown, FileSpreadsheet, FileUp } from "lucide-react";
import { useState } from "react";
import {
  DUPLICATE_POLICIES,
  type DuplicatePolicy,
  type ImportPreview,
} from "../../../../shared/transfer";
import { ActionNotice, type NoticeAction } from "../../components/ActionNotice";
import { IMPORT_FAILURE_MESSAGES } from "./transferLabels";
import "./TransferPage.css";
import { Button } from "../../components/Button";

const POLICY_LABELS: Record<DuplicatePolicy, string> = {
  skip: "Mantener lo que ya tengo y no importarlo",
  replace: "Sustituirlo por la versión del archivo",
  copy: "Importarlo como elementos nuevos (duplicados)",
};

const count = (n: number) => (n === 1 ? "1 obra" : `${n} obras`);
const exhibitionCount = (n: number) =>
  n === 1 ? "1 exposición" : `${n} exposiciones`;

/** What importing the package would do, one sentence per line. */
function summaryLines(preview: ImportPreview): string[] {
  const { newCount, duplicates, newExhibitions, duplicateExhibitions } =
    preview;
  const plural = (n: number, one: string, many: string) =>
    n === 1 ? one : many.replace("#", String(n));
  return [
    newCount === 0
      ? "Ninguna obra nueva."
      : plural(
          newCount,
          "Se añadirá 1 obra nueva.",
          "Se añadirán # obras nuevas.",
        ),
    duplicates.length > 0 &&
      plural(
        duplicates.length,
        "1 obra ya está en tu inventario.",
        "# obras ya están en tu inventario.",
      ),
    newExhibitions > 0 &&
      plural(
        newExhibitions,
        "Se añadirá 1 exposición.",
        "Se añadirán # exposiciones.",
      ),
    duplicateExhibitions.length > 0 &&
      plural(
        duplicateExhibitions.length,
        "1 exposición ya está en tu inventario.",
        "# exposiciones ya están en tu inventario.",
      ),
    preview.trashedSkipped > 0 &&
      plural(
        preview.trashedSkipped,
        "1 obra estaba en la papelera de origen y no se importará.",
        "# obras estaban en la papelera de origen y no se importarán.",
      ),
  ].filter((line): line is string => Boolean(line));
}

export function TransferPage() {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [policy, setPolicy] = useState<DuplicatePolicy>("skip");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeAction | null>(null);

  async function run(action: () => Promise<void>, failure: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }

  const exportPackage = () =>
    run(async () => {
      const result = await window.artGallery.exportPackage(null);
      if (result) {
        setNotice({
          message: `${count(result.artworks)} exportadas a ${result.path}`,
        });
      }
    }, "No se pudo exportar. Comprueba la carpeta de destino y el espacio libre.");

  const exportCsv = () =>
    run(async () => {
      const result = await window.artGallery.exportCsv(null);
      if (result) {
        setNotice({
          message: `CSV con ${count(result.artworks)} guardado en ${result.path}`,
        });
      }
    }, "No se pudo guardar el CSV.");

  const chooseImport = () =>
    run(async () => {
      if (preview) await window.artGallery.cancelImport(preview.sessionId);
      setPreview(null);
      const result = await window.artGallery.previewImport();
      if (!result) return;
      if (result.ok) {
        setPolicy("skip");
        setPreview(result.preview);
      } else {
        setError(IMPORT_FAILURE_MESSAGES[result.reason]);
      }
    }, "No se pudo leer el archivo.");

  const applyImport = (current: ImportPreview) =>
    run(async () => {
      setPreview(null);
      const result = await window.artGallery.applyImport(
        current.sessionId,
        policy,
      );
      const parts = [
        `${count(result.added)} añadidas`,
        result.replaced > 0 && `${result.replaced} sustituidas`,
        result.skipped > 0 && `${result.skipped} sin cambios`,
        result.exhibitions > 0 && exhibitionCount(result.exhibitions),
      ].filter(Boolean);
      setNotice({ message: `Importación completada: ${parts.join(", ")}.` });
    }, "No se pudo completar la importación. Tu inventario no se ha modificado.");

  const cancelImport = (current: ImportPreview) => {
    setPreview(null);
    void window.artGallery.cancelImport(current.sessionId);
  };

  return (
    <section className="transfer-page" aria-labelledby="transfer-title">
      <header className="page-header">
        <h1 id="transfer-title" className="page-header__title">
          Exportación e importación
        </h1>
      </header>

      <div className="page-sections">
        <section className="page-section" aria-labelledby="export-title">
          <h2 id="export-title" className="page-section__title">
            Exportar
          </h2>
          <p className="page-section__text">
            Un archivo <strong>.artgallery</strong> contiene las obras con todos
            sus datos y sus imágenes originales, y se puede abrir con ArtGallery
            en otro equipo. Para exportar solo algunas obras, selecciónalas en
            la Galería y pulsa «Exportar…».
          </p>
          <div className="page-section__actions">
            <Button disabled={busy} onClick={exportPackage}>
              <FileDown aria-hidden size={16} />
              Exportar todo el inventario…
            </Button>
            <Button disabled={busy} onClick={exportCsv}>
              <FileSpreadsheet aria-hidden size={16} />
              Exportar metadatos a CSV…
            </Button>
          </div>
          <p className="page-section__hint">
            El CSV solo contiene datos, sin imágenes, para usarlo en una hoja de
            cálculo. No sustituye a una copia de seguridad.
          </p>
        </section>

        <section className="page-section" aria-labelledby="import-title">
          <h2 id="import-title" className="page-section__title">
            Importar
          </h2>
          <p className="page-section__text">
            Importar añade obras de un archivo .artgallery a tu inventario sin
            borrar nada. Verás un resumen antes de aplicar ningún cambio. Para
            sustituir todo el inventario por una copia, usa Copias y ajustes.
          </p>
          <Button variant="primary" disabled={busy} onClick={chooseImport}>
            <FileUp aria-hidden size={16} />
            Elegir archivo para importar…
          </Button>

          {preview && (
            <div className="import-preview" aria-labelledby="preview-title">
              <h3 id="preview-title" className="import-preview__title">
                {preview.fileName}
              </h3>
              <ul className="import-preview__summary">
                {summaryLines(preview).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              {(preview.duplicates.length > 0 ||
                preview.duplicateExhibitions.length > 0) && (
                <fieldset className="import-preview__policy">
                  <legend className="field__label">
                    Lo que ya está en tu inventario
                  </legend>
                  {DUPLICATE_POLICIES.map((option) => (
                    <label key={option} className="checkbox">
                      <input
                        type="radio"
                        name="duplicate-policy"
                        value={option}
                        checked={policy === option}
                        onChange={() => setPolicy(option)}
                      />
                      {POLICY_LABELS[option]}
                    </label>
                  ))}
                  <details className="import-preview__duplicates">
                    <summary>Ver cuáles</summary>
                    <ul>
                      {preview.duplicates.map(({ id, title }) => (
                        <li key={id} className="artwork-title">
                          {title}
                        </li>
                      ))}
                      {preview.duplicateExhibitions.map(({ id, name }) => (
                        <li key={id}>Exposición «{name}»</li>
                      ))}
                    </ul>
                  </details>
                </fieldset>
              )}

              <div className="page-section__actions">
                <Button
                  variant="primary"
                  disabled={busy}
                  onClick={() => applyImport(preview)}
                >
                  Importar
                </Button>
                <Button onClick={() => cancelImport(preview)}>Cancelar</Button>
              </div>
            </div>
          )}
        </section>

        {busy && (
          <p className="page-section__text" role="status">
            Procesando… No cierres la aplicación.
          </p>
        )}
        {error && (
          <p className="transfer-page__error" role="alert">
            {error}
          </p>
        )}
      </div>

      <ActionNotice action={notice} onDismiss={() => setNotice(null)} />
    </section>
  );
}
