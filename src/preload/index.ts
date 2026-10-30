import { contextBridge, ipcRenderer } from "electron";
import { IpcChannel, type ArtGalleryApi } from "../shared/api";

const api: ArtGalleryApi = {
  listArtworks: () => ipcRenderer.invoke(IpcChannel.listArtworks),
  createArtwork: (input) => ipcRenderer.invoke(IpcChannel.createArtwork, input),
  pickImages: () => ipcRenderer.invoke(IpcChannel.pickImages),
};

contextBridge.exposeInMainWorld("artGallery", api);
