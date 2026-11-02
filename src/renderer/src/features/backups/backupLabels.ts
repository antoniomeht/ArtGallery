import type { BackupOrigin, RestoreFailure } from "../../../../shared/backup";
import type { AutoBackupFrequency } from "../../../../shared/settings";

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
  "not-a-package": "El archivo no es una copia de ArtGallery o está dañado.",
  "unsupported-version":
    "La copia se hizo con una versión más nueva de ArtGallery. Actualiza la aplicación para restaurarla.",
  "unsafe-entry":
    "La copia contiene archivos que no corresponden a ArtGallery y no se ha abierto por seguridad.",
  "invalid-data": "Los datos de la copia están dañados.",
  "missing-image": "Faltan imágenes dentro de la copia.",
  "corrupted-image": "Alguna imagen de la copia está dañada.",
  "not-a-backup":
    "El archivo es una exportación de obras, no una copia completa del inventario.",
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
