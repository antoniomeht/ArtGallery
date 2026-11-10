import {
  contextBridge,
  ipcRenderer,
  webUtils,
  type IpcRendererEvent,
} from "electron";
import { IpcChannel, type ArtGalleryApi } from "../shared/api";
import type { CreationProgress } from "../shared/artwork";

const api: ArtGalleryApi = {
  listArtworks: (query) => ipcRenderer.invoke(IpcChannel.listArtworks, query),
  listFilterOptions: () => ipcRenderer.invoke(IpcChannel.listFilterOptions),
  getArtwork: (id) => ipcRenderer.invoke(IpcChannel.getArtwork, id),
  createArtworksFromImages: (imagePaths) =>
    ipcRenderer.invoke(IpcChannel.createArtworksFromImages, imagePaths),
  onCreationProgress: (listener) => {
    const handle = (_event: IpcRendererEvent, progress: CreationProgress) =>
      listener(progress);
    ipcRenderer.on(IpcChannel.onCreationProgress, handle);
    return () => ipcRenderer.off(IpcChannel.onCreationProgress, handle);
  },
  updateArtwork: (id, fields) =>
    ipcRenderer.invoke(IpcChannel.updateArtwork, id, fields),
  setStatus: (artworkIds, status) =>
    ipcRenderer.invoke(IpcChannel.setStatus, artworkIds, status),
  addImages: (artworkId, imagePaths) =>
    ipcRenderer.invoke(IpcChannel.addImages, artworkId, imagePaths),
  removeImage: (artworkId, imageId) =>
    ipcRenderer.invoke(IpcChannel.removeImage, artworkId, imageId),
  setPrimaryImage: (artworkId, imageId) =>
    ipcRenderer.invoke(IpcChannel.setPrimaryImage, artworkId, imageId),
  listTrash: () => ipcRenderer.invoke(IpcChannel.listTrash),
  moveToTrash: (artworkIds) =>
    ipcRenderer.invoke(IpcChannel.moveToTrash, artworkIds),
  restoreFromTrash: (artworkIds) =>
    ipcRenderer.invoke(IpcChannel.restoreFromTrash, artworkIds),
  deleteFromTrash: (artworkIds) =>
    ipcRenderer.invoke(IpcChannel.deleteFromTrash, artworkIds),
  emptyTrash: () => ipcRenderer.invoke(IpcChannel.emptyTrash),
  listExhibitions: () => ipcRenderer.invoke(IpcChannel.listExhibitions),
  getExhibition: (id) => ipcRenderer.invoke(IpcChannel.getExhibition, id),
  createExhibition: (fields) =>
    ipcRenderer.invoke(IpcChannel.createExhibition, fields),
  updateExhibition: (id, fields) =>
    ipcRenderer.invoke(IpcChannel.updateExhibition, id, fields),
  deleteExhibition: (id) => ipcRenderer.invoke(IpcChannel.deleteExhibition, id),
  setExhibitionArtworks: (id, artworkIds) =>
    ipcRenderer.invoke(IpcChannel.setExhibitionArtworks, id, artworkIds),
  addToExhibition: (id, artworkIds) =>
    ipcRenderer.invoke(IpcChannel.addToExhibition, id, artworkIds),
  listCollections: () => ipcRenderer.invoke(IpcChannel.listCollections),
  createCollection: (name) =>
    ipcRenderer.invoke(IpcChannel.createCollection, name),
  renameCollection: (id, name) =>
    ipcRenderer.invoke(IpcChannel.renameCollection, id, name),
  deleteCollection: (id) => ipcRenderer.invoke(IpcChannel.deleteCollection, id),
  restoreCollection: (deleted) =>
    ipcRenderer.invoke(IpcChannel.restoreCollection, deleted),
  setCollectionMembership: (id, artworkIds, member) =>
    ipcRenderer.invoke(
      IpcChannel.setCollectionMembership,
      id,
      artworkIds,
      member,
    ),
  listArtworkCollections: (artworkId) =>
    ipcRenderer.invoke(IpcChannel.listArtworkCollections, artworkId),
  listDocuments: (query) => ipcRenderer.invoke(IpcChannel.listDocuments, query),
  getDocument: (id) => ipcRenderer.invoke(IpcChannel.getDocument, id),
  uploadDocuments: (paths) =>
    ipcRenderer.invoke(IpcChannel.uploadDocuments, paths),
  pickDocumentFiles: () => ipcRenderer.invoke(IpcChannel.pickDocumentFiles),
  replaceDocumentFile: (id) =>
    ipcRenderer.invoke(IpcChannel.replaceDocumentFile, id),
  updateDocument: (id, fields) =>
    ipcRenderer.invoke(IpcChannel.updateDocument, id, fields),
  deleteDocument: (id) => ipcRenderer.invoke(IpcChannel.deleteDocument, id),
  restoreDocument: (id) => ipcRenderer.invoke(IpcChannel.restoreDocument, id),
  openDocumentExternally: (id) =>
    ipcRenderer.invoke(IpcChannel.openDocumentExternally, id),
  saveDocumentAs: (id) => ipcRenderer.invoke(IpcChannel.saveDocumentAs, id),
  createTextDocument: (title) =>
    ipcRenderer.invoke(IpcChannel.createTextDocument, title),
  saveDocumentContent: (id, content) =>
    ipcRenderer.invoke(IpcChannel.saveDocumentContent, id, content),
  addDocumentImage: (documentId) =>
    ipcRenderer.invoke(IpcChannel.addDocumentImage, documentId),
  addDocumentComment: (documentId, body) =>
    ipcRenderer.invoke(IpcChannel.addDocumentComment, documentId, body),
  listDocumentComments: (documentId) =>
    ipcRenderer.invoke(IpcChannel.listDocumentComments, documentId),
  deleteDocumentComment: (commentId) =>
    ipcRenderer.invoke(IpcChannel.deleteDocumentComment, commentId),
  linkDocuments: (documentIds, target) =>
    ipcRenderer.invoke(IpcChannel.linkDocuments, documentIds, target),
  unlinkDocument: (documentId, target) =>
    ipcRenderer.invoke(IpcChannel.unlinkDocument, documentId, target),
  listLinkedDocuments: (target) =>
    ipcRenderer.invoke(IpcChannel.listLinkedDocuments, target),
  exportCatalogPdf: (exhibitionId, options) =>
    ipcRenderer.invoke(IpcChannel.exportCatalogPdf, exhibitionId, options),
  exportLabelsPdf: (source, options) =>
    ipcRenderer.invoke(IpcChannel.exportLabelsPdf, source, options),
  printReady: () => ipcRenderer.send(IpcChannel.printReady),
  getBackupOverview: () => ipcRenderer.invoke(IpcChannel.getBackupOverview),
  getSettings: () => ipcRenderer.invoke(IpcChannel.getSettings),
  updateSettings: (changes) =>
    ipcRenderer.invoke(IpcChannel.updateSettings, changes),
  createBackup: () => ipcRenderer.invoke(IpcChannel.createBackup),
  restoreBackup: (path) => ipcRenderer.invoke(IpcChannel.restoreBackup, path),
  chooseBackupFolder: () => ipcRenderer.invoke(IpcChannel.chooseBackupFolder),
  chooseBackupFile: () => ipcRenderer.invoke(IpcChannel.chooseBackupFile),
  openFolder: (which) => ipcRenderer.invoke(IpcChannel.openFolder, which),
  exportPackage: (artworkIds) =>
    ipcRenderer.invoke(IpcChannel.exportPackage, artworkIds),
  exportExhibition: (exhibitionId) =>
    ipcRenderer.invoke(IpcChannel.exportExhibition, exhibitionId),
  exportCsv: (artworkIds) =>
    ipcRenderer.invoke(IpcChannel.exportCsv, artworkIds),
  previewImport: () => ipcRenderer.invoke(IpcChannel.previewImport),
  applyImport: (sessionId, policy) =>
    ipcRenderer.invoke(IpcChannel.applyImport, sessionId, policy),
  cancelImport: (sessionId) =>
    ipcRenderer.invoke(IpcChannel.cancelImport, sessionId),
  pickImages: () => ipcRenderer.invoke(IpcChannel.pickImages),
  pathForFile: (file) => webUtils.getPathForFile(file),
};

contextBridge.exposeInMainWorld("artGallery", api);
