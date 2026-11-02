import { join } from "node:path";
import { openDatabase } from "../database/openDatabase";
import { ImageStore } from "../images/imageStore";
import { ArtworkRepository } from "../inventory/artworkRepository";
import { InventoryService } from "../inventory/inventoryService";

/** Opens the inventory stored in `dataDir`, as the app does on startup. */
export function openInventory(dataDir: string) {
  const db = openDatabase(join(dataDir, "artgallery.sqlite"));
  const images = new ImageStore(join(dataDir, "images"));
  const service = new InventoryService(new ArtworkRepository(db), images);
  return { db, images, service };
}
