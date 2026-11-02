import type { BackupOrigin, RestoreFailure } from "../../../../shared/backup";
import type { AutoBackupFrequency } from "../../../../shared/settings";
import { IMPORT_FAILURE_MESSAGES } from "../transfer/transferLabels";

export const ORIGIN_LABELS: Record<BackupOrigin, string> = {
  manual: "Manual",
  automatic: "Automática",
  "before-restore": "Antes de restaurar",
};

export const FREQUENCY_LABELS: Record<AutoBackupFrequency, string> = {
  daily: "Cada día",
  weekly: "Cada semana",
  off: "Desactivadas",
};

export const RESTORE_FAILURE_MESSAGES: Record<RestoreFailure, string> = {
  ...IMPORT_FAILURE_MESSAGES,
  "not-a-backup":
    "El archivo es una exportación de obras, no una copia completa. Para añadir sus obras, usa Exportación e importación.",
};

const dateTime = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "long",
  timeStyle: "short",
});

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${value.toLocaleString("es-ES", { maximumFractionDigits: digits })} ${units[unit]}`;
}
