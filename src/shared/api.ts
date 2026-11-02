import type {
  Artwork,
  ArtworkFieldsInput,
  ArtworkQuery,
  ArtworkStatus,
  ArtworkSummary,
  FilterOptions,
  NewArtwork,
} from "./artwork";
import type { BackupInfo, RestoreResult } from "./backup";
import type { Settings } from "./settings";

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
  createArtwork(input: NewArtwork): Promise<ArtworkSummary>;
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
  getBackupOverview(): Promise<BackupOverview>;
  updateSettings(changes: Partial<Settings>): Promise<Settings>;
  createBackup(): Promise<BackupInfo>;
  /** Validates the backup and replaces the inventory with its contents. */
  restoreBackup(path: string): Promise<RestoreResult>;
  /** Returns the chosen folder, already saved in the settings, or null. */
  chooseBackupFolder(): Promise<string | null>;
  chooseBackupFile(): Promise<string | null>;
  openFolder(which: "backups" | "data"): Promise<void>;
  /** Opens the system file picker and returns the chosen image paths. */
  pickImages(): Promise<string[]>;
}

export const IpcChannel = {
  listArtworks: "artworks:list",
  listFilterOptions: "artworks:filter-options",
  getArtwork: "artworks:get",
  createArtwork: "artworks:create",
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
  getBackupOverview: "backups:overview",
  updateSettings: "settings:update",
  createBackup: "backups:create",
  restoreBackup: "backups:restore",
  chooseBackupFolder: "backups:choose-folder",
  chooseBackupFile: "backups:choose-file",
  openFolder: "shell:open-folder",
  pickImages: "dialog:pick-images",
} as const satisfies Record<keyof ArtGalleryApi, string>;
