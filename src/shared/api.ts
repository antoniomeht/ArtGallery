import type {
  Artwork,
  ArtworkFieldsInput,
  ArtworkQuery,
  ArtworkStatus,
  ArtworkSummary,
  CreationProgress,
  FilterOptions,
} from "./artwork";
import type { BackupInfo, RestoreResult } from "./backup";
import type {
  Exhibition,
  ExhibitionDetail,
  ExhibitionFieldsInput,
  ExhibitionSummary,
} from "./exhibition";
import type { LabelOptions } from "./labels";
import type { PrintSource } from "./print";
import type { Settings } from "./settings";
import type {
  DuplicatePolicy,
  ExportResult,
  ImportPreviewResult,
  ImportResult,
} from "./transfer";

export interface BackupOverview {
  /** Where backups are written and looked for. */
  folder: string;
  /** Where the database and images live. */
  dataFolder: string;
  settings: Settings;
  backups: BackupInfo[];
}

/** Contract exposed by the preload script as `window.artGallery`. */
export interface ArtGalleryApi {
  listArtworks(query?: ArtworkQuery): Promise<ArtworkSummary[]>;
  listFilterOptions(): Promise<FilterOptions>;
  getArtwork(id: string): Promise<Artwork>;
  /** Creates one artwork per image; all of them or, on failure, none. */
  createArtworksFromImages(imagePaths: string[]): Promise<ArtworkSummary[]>;
  /** Listens to the progress of `createArtworksFromImages`; returns how to stop. */
  onCreationProgress(
    listener: (progress: CreationProgress) => void,
  ): () => void;
  updateArtwork(id: string, fields: ArtworkFieldsInput): Promise<Artwork>;
  setStatus(artworkIds: string[], status: ArtworkStatus): Promise<void>;
  addImages(artworkId: string, imagePaths: string[]): Promise<Artwork>;
  removeImage(artworkId: string, imageId: string): Promise<Artwork>;
  setPrimaryImage(artworkId: string, imageId: string): Promise<Artwork>;
  listTrash(): Promise<ArtworkSummary[]>;
  moveToTrash(artworkIds: string[]): Promise<void>;
  restoreFromTrash(artworkIds: string[]): Promise<void>;
  /** Permanent: removes the artworks and their images. */
  deleteFromTrash(artworkIds: string[]): Promise<void>;
  emptyTrash(): Promise<void>;
  listExhibitions(): Promise<ExhibitionSummary[]>;
  getExhibition(id: string): Promise<ExhibitionDetail>;
  createExhibition(fields: ExhibitionFieldsInput): Promise<Exhibition>;
  updateExhibition(
    id: string,
    fields: ExhibitionFieldsInput,
  ): Promise<Exhibition>;
  /** Deletes the exhibition only; its artworks stay in the inventory. */
  deleteExhibition(id: string): Promise<void>;
  /** Sets the artworks and their order. */
  setExhibitionArtworks(
    id: string,
    artworkIds: string[],
  ): Promise<ExhibitionDetail>;
  addToExhibition(id: string, artworkIds: string[]): Promise<ExhibitionDetail>;
  /** Asks where to save and writes the exhibition catalogue as PDF. */
  exportCatalogPdf(
    exhibitionId: string,
    options: { includePrices: boolean },
  ): Promise<{ path: string } | null>;
  /** Asks where to save and writes the labels as PDF on A4 sheets. */
  exportLabelsPdf(
    source: PrintSource,
    options: LabelOptions,
  ): Promise<{ path: string } | null>;
  /** Called by the print window once its document is fully drawn. */
  printReady(): void;
  getBackupOverview(): Promise<BackupOverview>;
  getSettings(): Promise<Settings>;
  updateSettings(changes: Partial<Settings>): Promise<Settings>;
  createBackup(): Promise<BackupInfo>;
  /** Validates the backup and replaces the inventory with its contents. */
  restoreBackup(path: string): Promise<RestoreResult>;
  /** Returns the chosen folder, already saved in the settings, or null. */
  chooseBackupFolder(): Promise<string | null>;
  chooseBackupFile(): Promise<string | null>;
  openFolder(which: "backups" | "data"): Promise<void>;
  /** Asks where to save; null ids exports every artwork outside the trash. */
  exportPackage(artworkIds: string[] | null): Promise<ExportResult | null>;
  exportExhibition(exhibitionId: string): Promise<ExportResult | null>;
  exportCsv(artworkIds: string[] | null): Promise<ExportResult | null>;
  /** Asks for a package and validates it; null if the user cancels. */
  previewImport(): Promise<ImportPreviewResult | null>;
  applyImport(
    sessionId: string,
    policy: DuplicatePolicy,
  ): Promise<ImportResult>;
  cancelImport(sessionId: string): Promise<void>;
  /** Opens the system file picker and returns the chosen image paths. */
  pickImages(): Promise<string[]>;
  /** The path on disk of a file dropped on the window; empty if it has none. */
  pathForFile(file: File): string;
}

export const IpcChannel = {
  listArtworks: "artworks:list",
  listFilterOptions: "artworks:filter-options",
  getArtwork: "artworks:get",
  createArtworksFromImages: "artworks:create-from-images",
  onCreationProgress: "artworks:creation-progress",
  updateArtwork: "artworks:update",
  setStatus: "artworks:set-status",
  addImages: "artworks:add-images",
  removeImage: "artworks:remove-image",
  setPrimaryImage: "artworks:set-primary-image",
  listTrash: "trash:list",
  moveToTrash: "trash:move",
  restoreFromTrash: "trash:restore",
  deleteFromTrash: "trash:delete",
  emptyTrash: "trash:empty",
  listExhibitions: "exhibitions:list",
  getExhibition: "exhibitions:get",
  createExhibition: "exhibitions:create",
  updateExhibition: "exhibitions:update",
  deleteExhibition: "exhibitions:delete",
  setExhibitionArtworks: "exhibitions:set-artworks",
  addToExhibition: "exhibitions:add-artworks",
  exportCatalogPdf: "print:catalog",
  exportLabelsPdf: "print:labels",
  printReady: "print:ready",
  getBackupOverview: "backups:overview",
  getSettings: "settings:get",
  updateSettings: "settings:update",
  createBackup: "backups:create",
  restoreBackup: "backups:restore",
  chooseBackupFolder: "backups:choose-folder",
  chooseBackupFile: "backups:choose-file",
  openFolder: "shell:open-folder",
  exportPackage: "transfer:export-package",
  exportExhibition: "transfer:export-exhibition",
  exportCsv: "transfer:export-csv",
  previewImport: "transfer:preview-import",
  applyImport: "transfer:apply-import",
  cancelImport: "transfer:cancel-import",
  pickImages: "dialog:pick-images",
} as const satisfies Record<
  Exclude<keyof ArtGalleryApi, "pathForFile">,
  string
>;
