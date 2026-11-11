import { FolderOpen, HardDriveDownload, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { BackupOverview } from "../../../../shared/api";
import type { BackupInfo } from "../../../../shared/backup";
import {
  AUTO_BACKUP_FREQUENCIES,
  type Settings,
} from "../../../../shared/settings";
import { ActionNotice, type NoticeAction } from "../../components/ActionNotice";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import {
  FREQUENCY_LABELS,
  formatBytes,
  formatDateTime,
  ORIGIN_LABELS,
  RESTORE_FAILURE_MESSAGES,
} from "./backupLabels";
import { Button } from "../../components/Button";
import { DefaultArtistSection } from "./DefaultArtistSection";
import { NumberRangesSection } from "./NumberRangesSection";
import { DimensionUnitSection } from "./DimensionUnitSection";
import "./BackupsPage.css";

const KEEP_OPTIONS = [3, 5, 10, 20, 30];

/** A backup to restore: one from the list, or a file picked by the user. */
type PendingRestore = { path: string; description: string };

export function BackupsPage() {
  const [overview, setOverview] = useState<BackupOverview | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [pending, setPending] = useState<PendingRestore | null>(null);
  const [notice, setNotice] = useState<NoticeAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    window.artGallery
      .getBackupOverview()
      .then(setOverview, () => setLoadError(true));
  }, []);
  useEffect(load, [load]);

  async function updateSettings(changes: Partial<Settings>) {
    await window.artGallery.updateSettings(changes);
    load();
  }

  async function createBackup() {
    setBusy("backup");
    setError(null);
    try {
      const backup = await window.artGallery.createBackup();
      setNotice({ message: `Copia creada y verificada: ${backup.fileName}` });
      load();
    } catch {
      setError(
        "No se pudo crear la copia. Comprueba que la carpeta existe y que hay espacio libre.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function restore({ path }: PendingRestore) {
    setPending(null);
    setBusy("restore");
    setError(null);
    try {
      const result = await window.artGallery.restoreBackup(path);
      if (result.ok) {
        setNotice({
          message: result.safetyBackup
            ? `Copia restaurada. El inventario anterior se guardó en ${result.safetyBackup}.`
            : "Copia restaurada.",
        });
        load();
      } else {
        setError(RESTORE_FAILURE_MESSAGES[result.reason]);
      }
    } catch {
      setError(
        "No se pudo restaurar la copia. El inventario actual no se ha modificado.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function chooseFileToRestore() {
    const path = await window.artGallery.chooseBackupFile();
    if (path) setPending({ path, description: `el archivo ${path}` });
  }

  const describe = (backup: BackupInfo & { readable: true }) =>
    `la copia del ${formatDateTime(backup.createdAt)} (${countLabel(backup.artworks, "obra")})`;

  return (
    <section className="backups-page" aria-labelledby="backups-title">
      <header className="page-header">
        <h1 id="backups-title" className="page-header__title">
          Copias de seguridad y ajustes
        </h1>
      </header>

      {loadError && (
        <p className="backups-page__error" role="alert">
          No se pudo leer la configuración de copias.
        </p>
      )}

      {overview && (
        <div className="page-sections">
          <DefaultArtistSection
            value={overview.settings.defaultArtist}
            onSave={(defaultArtist) => void updateSettings({ defaultArtist })}
          />

          <DimensionUnitSection
            value={overview.settings.dimensionUnit}
            onChange={(dimensionUnit) => void updateSettings({ dimensionUnit })}
          />

          <NumberRangesSection
            value={overview.settings.numberRanges}
            onSave={(numberRanges) => updateSettings({ numberRanges })}
          />

          <section className="page-section" aria-labelledby="backup-now">
            <h2 id="backup-now" className="page-section__title">
              Copias de seguridad
            </h2>
            <p className="page-section__text">
              Una copia guarda en un solo archivo todo el inventario, incluida
              la papelera, y los originales de todas las imágenes. Cada copia se
              comprueba completa al terminar.
            </p>

            <div className="folder-row">
              <span className="field__label">Carpeta de copias</span>
              <p className="folder-row__path">{overview.folder}</p>
              <div className="folder-row__actions">
                <Button
                  onClick={async () => {
                    if (await window.artGallery.chooseBackupFolder()) load();
                  }}
                >
                  Cambiar carpeta…
                </Button>
                <Button onClick={() => window.artGallery.openFolder("backups")}>
                  <FolderOpen aria-hidden size={16} />
                  Abrir carpeta
                </Button>
              </div>
            </div>

            <div className="settings-row">
              <label className="field">
                <span className="field__label">Copias automáticas</span>
                <select
                  className="field__input"
                  value={overview.settings.autoBackup}
                  onChange={(event) =>
                    updateSettings({
                      autoBackup: event.target.value as Settings["autoBackup"],
                    })
                  }
                >
                  {AUTO_BACKUP_FREQUENCIES.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {FREQUENCY_LABELS[frequency]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field__label">
                  Copias automáticas a conservar
                </span>
                <select
                  className="field__input"
                  value={overview.settings.keepAutomaticBackups}
                  onChange={(event) =>
                    updateSettings({
                      keepAutomaticBackups: Number(event.target.value),
                    })
                  }
                >
                  {KEEP_OPTIONS.map((count) => (
                    <option key={count} value={count}>
                      Las {count} más recientes
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="page-section__hint">
              Las copias manuales nunca se borran automáticamente.
            </p>

            <div className="page-section__actions">
              <Button
                variant="primary"
                disabled={busy !== null}
                onClick={createBackup}
              >
                <HardDriveDownload aria-hidden size={16} />
                {busy === "backup" ? "Creando copia…" : "Crear copia ahora"}
              </Button>
            </div>
            {error && (
              <p className="backups-page__error" role="alert">
                {error}
              </p>
            )}
          </section>

          <section className="page-section" aria-labelledby="backup-list">
            <div className="page-section__heading">
              <h2 id="backup-list" className="page-section__title">
                Copias disponibles
              </h2>
              <Button disabled={busy !== null} onClick={chooseFileToRestore}>
                Restaurar desde otro archivo…
              </Button>
            </div>
            {busy === "restore" && (
              <p className="page-section__text" role="status">
                Restaurando copia… No cierres la aplicación.
              </p>
            )}
            {overview.backups.length === 0 ? (
              <p className="page-section__text">
                Todavía no hay copias en esta carpeta.
              </p>
            ) : (
              <ul className="backup-list">
                {overview.backups.map((backup) => (
                  <li key={backup.path} className="backup-item">
                    <div className="backup-item__text">
                      <span className="backup-item__title">
                        {backup.readable
                          ? formatDateTime(backup.createdAt)
                          : backup.fileName}
                      </span>
                      <span className="backup-item__meta">
                        {backup.readable
                          ? `${ORIGIN_LABELS[backup.origin]}. ${countLabel(backup.artworks, "obra")}, ${countLabel(backup.images, "imagen", "imágenes")}, ${formatBytes(backup.bytes)}.`
                          : "No se puede leer este archivo como copia de ArtGallery."}
                      </span>
                    </div>
                    {backup.readable && (
                      <Button
                        disabled={busy !== null}
                        onClick={() =>
                          setPending({
                            path: backup.path,
                            description: describe(backup),
                          })
                        }
                      >
                        <RotateCcw aria-hidden size={16} />
                        Restaurar…
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="page-section" aria-labelledby="data-safety">
            <h2 id="data-safety" className="page-section__title">
              Qué se conserva si desinstalas
            </h2>
            <ul className="page-section__list">
              <li>
                El inventario y las imágenes están en{" "}
                <span className="folder-inline">{overview.dataFolder}</span>. El
                desinstalador de Windows está configurado para no borrar esta
                carpeta, aunque podrían eliminarla el sistema, otras
                herramientas o tú mismo.
              </li>
              <li>
                Las copias se guardan fuera de la aplicación, en la carpeta de
                copias. Al reinstalar, ArtGallery las busca ahí; si las moviste,
                elige su carpeta o usa «Restaurar desde otro archivo».
              </li>
              <li>
                Si se pierden los datos y también todas las copias, el
                inventario no se puede recuperar. Guarda copias en otro disco o
                en una carpeta sincronizada.
              </li>
            </ul>
            <Button onClick={() => window.artGallery.openFolder("data")}>
              <FolderOpen aria-hidden size={16} />
              Abrir carpeta de datos
            </Button>
          </section>
        </div>
      )}

      {pending && (
        <ConfirmDialog
          title="¿Restaurar esta copia?"
          message={`El inventario actual se sustituirá por ${pending.description}. Antes se guardará una copia del estado actual en la carpeta de copias.`}
          confirmLabel="Restaurar"
          onCancel={() => setPending(null)}
          onConfirm={() => void restore(pending)}
        />
      )}

      <ActionNotice action={notice} onDismiss={() => setNotice(null)} />
    </section>
  );
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
