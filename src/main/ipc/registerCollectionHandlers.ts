import { ipcMain } from "electron";
import { z } from "zod";
import { IpcChannel } from "../../shared/api";
import type { CollectionService } from "../collections/collectionService";

const id = z.string().min(1);
const artworkIds = z.array(z.string().min(1)).max(10_000);
const deletedCollection = z.object({
  id,
  name: z.string(),
  artworkIds,
  documentIds: z.array(z.string().min(1)).max(10_000).default([]),
  createdAt: z.string(),
});

/** Names are validated by the service before anything is written. */
export function registerCollectionHandlers(collections: CollectionService) {
  ipcMain.handle(IpcChannel.listCollections, () => collections.list());
  ipcMain.handle(IpcChannel.createCollection, (_event, name: unknown) =>
    collections.create(z.string().parse(name)),
  );
  ipcMain.handle(
    IpcChannel.renameCollection,
    (_event, collectionId: unknown, name: unknown) =>
      collections.rename(id.parse(collectionId), z.string().parse(name)),
  );
  ipcMain.handle(IpcChannel.deleteCollection, (_event, collectionId: unknown) =>
    collections.delete(id.parse(collectionId)),
  );
  ipcMain.handle(IpcChannel.restoreCollection, (_event, deleted: unknown) =>
    collections.restore(deletedCollection.parse(deleted)),
  );
  ipcMain.handle(
    IpcChannel.setCollectionMembership,
    (_event, collectionId: unknown, ids: unknown, member: unknown) =>
      collections.setMembership(
        id.parse(collectionId),
        artworkIds.parse(ids),
        z.boolean().parse(member),
      ),
  );
  ipcMain.handle(IpcChannel.listArtworkCollections, (_event, artworkId) =>
    collections.listForArtwork(id.parse(artworkId)),
  );
}
