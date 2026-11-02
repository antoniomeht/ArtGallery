import type { PackageFailure } from "../../../../shared/transfer";

export const IMPORT_FAILURE_MESSAGES: Record<PackageFailure, string> = {
  "not-a-package": "El archivo no es un paquete de ArtGallery o está dañado.",
  "unsupported-version":
    "El archivo se creó con una versión más nueva de ArtGallery. Actualiza la aplicación para importarlo.",
  "unsafe-entry":
    "El archivo contiene elementos que no corresponden a ArtGallery y no se ha abierto por seguridad.",
  "invalid-data": "Los datos del archivo están dañados.",
  "missing-image": "Faltan imágenes dentro del archivo.",
  "corrupted-image": "Alguna imagen del archivo está dañada.",
};
