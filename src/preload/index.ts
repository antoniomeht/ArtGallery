import { contextBridge, ipcRenderer } from "electron";
import { IpcChannel, type ArtGalleryApi } from "../shared/api";

const api: ArtGalleryApi = {
  listArtworks: () => ipcRenderer.invoke(IpcChannel.listArtworks),
  getArtwork: (id) => ipcRenderer.invoke(IpcChannel.getArtwork, id),
  createArtwork: (input) => ipcRenderer.invoke(IpcChannel.createArtwork, input),
  updateArtwork: (id, fields) =>
    ipcRenderer.invoke(IpcChannel.updateArtwork, id, fields),
  addImages: (artworkId, imagePaths) =>
    ipcRenderer.invoke(IpcChannel.addImages, artworkId, imagePaths),
  removeImage: (artworkId, imageId) =>
    ipcRenderer.invoke(IpcChannel.removeImage, artworkId, imageId),
  setPrimaryImage: (artworkId, imageId) =>
    ipcRenderer.invoke(IpcChannel.setPrimaryImage, artworkId, imageId),
  pickImages: () => ipcRenderer.invoke(IpcChannel.pickImages),
};

contextBridge.exposeInMainWorld("artGallery", api);
