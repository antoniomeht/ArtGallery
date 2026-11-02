import { contextBridge, ipcRenderer } from "electron";
import { IpcChannel, type ArtGalleryApi } from "../shared/api";

const api: ArtGalleryApi = {
  listArtworks: (query) => ipcRenderer.invoke(IpcChannel.listArtworks, query),
  listFilterOptions: () => ipcRenderer.invoke(IpcChannel.listFilterOptions),
  getArtwork: (id) => ipcRenderer.invoke(IpcChannel.getArtwork, id),
  createArtwork: (input) => ipcRenderer.invoke(IpcChannel.createArtwork, input),
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
  pickImages: () => ipcRenderer.invoke(IpcChannel.pickImages),
};

contextBridge.exposeInMainWorld("artGallery", api);
