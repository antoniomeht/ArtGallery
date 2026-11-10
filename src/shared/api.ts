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
import type { CollectionSummary, DeletedCollection } from "./collection";
import type {
  DocumentComment,
  DocumentDetail,
  DocumentFieldsInput,
  DocumentLinkRef,
  DocumentQuery,
  DocumentSummary,
  UploadResult,
} from "./document";
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
  listCollections(): Promise<CollectionSummary[]>;
  createCollection(name: string): Promise<CollectionSummary>;
  renameCollection(id: string, name: string): Promise<CollectionSummary>;
  /** Deletes the collection only; returns what is needed to restore it. */
  deleteCollection(id: string): Promise<DeletedCollection>;
  restoreCollection(deleted: DeletedCollection): Promise<void>;
  setCollectionMembership(
    id: string,
    artworkIds: string[],
    member: boolean,
  ): Promise<void>;
  listArtworkCollections(artworkId: string): Promise<CollectionSummary[]>;
  listDocuments(query?: DocumentQuery): Promise<DocumentSummary[]>;
  getDocument(id: string): Promise<DocumentDetail>;
  /** Adds each file on its own and reports the ones refused. */
  uploadDocuments(paths: string[]): Promise<UploadResult>;
  /** Opens the system file picker and returns the chosen paths. */
  pickDocumentFiles(): Promise<string[]>;
  /** Asks for a file and puts it in place of the current one; null if cancelled. */
  replaceDocumentFile(id: string): Promise<DocumentDetail | null>;
  updateDocument(
    id: string,
    fields: DocumentFieldsInput,
  ): Promise<DocumentDetail>;
  /** Hides the document; `restoreDocument` undoes it until the app restarts. */
  deleteDocument(id: string): Promise<void>;
  restoreDocument(id: string): Promise<void>;
  /** Opens a copy of the file with the system's application for it. */
  openDocumentExternally(id: string): Promise<void>;
  createTextDocument(title: string): Promise<DocumentDetail>;
  /** Checked against what the editor can make before it is written. */
  saveDocumentContent(id: string, content: unknown): Promise<DocumentDetail>;
  /** Asks for an image and copies it for the document; null if cancelled. */
  addDocumentImage(documentId: string): Promise<{ src: string } | null>;
  addDocumentComment(
    documentId: string,
    body: string,
  ): Promise<DocumentComment>;
  /** Comments whose text is still in the saved document. */
  listDocumentComments(documentId: string): Promise<DocumentComment[]>;
  deleteDocumentComment(commentId: string): Promise<void>;
  linkDocuments(documentIds: string[], target: DocumentLinkRef): Promise<void>;
  unlinkDocument(documentId: string, target: DocumentLinkRef): Promise<void>;
  listLinkedDocuments(target: DocumentLinkRef): Promise<DocumentSummary[]>;
  /** Asks where to save a copy of the file. */
  saveDocumentAs(id: string): Promise<{ path: string } | null>;
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
  listCollections: "collections:list",
  createCollection: "collections:create",
  renameCollection: "collections:rename",
  deleteCollection: "collections:delete",
  restoreCollection: "collections:restore",
  setCollectionMembership: "collections:set-membership",
  listArtworkCollections: "collections:for-artwork",
  listDocuments: "documents:list",
  getDocument: "documents:get",
  uploadDocuments: "documents:upload",
  pickDocumentFiles: "dialog:pick-documents",
  replaceDocumentFile: "documents:replace-file",
  updateDocument: "documents:update",
  deleteDocument: "documents:delete",
  restoreDocument: "documents:restore",
  openDocumentExternally: "documents:open-externally",
  saveDocumentAs: "documents:save-as",
  createTextDocument: "documents:create-text",
  saveDocumentContent: "documents:save-content",
  addDocumentImage: "documents:add-image",
  addDocumentComment: "documents:add-comment",
  listDocumentComments: "documents:list-comments",
  deleteDocumentComment: "documents:delete-comment",
  linkDocuments: "documents:link",
  unlinkDocument: "documents:unlink",
  listLinkedDocuments: "documents:list-linked",
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
