import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { openDatabase } from "../database/openDatabase";
import { ExhibitionRepository } from "../exhibitions/exhibitionRepository";
import { ExhibitionService } from "../exhibitions/exhibitionService";
import { ImageStore } from "../images/imageStore";
import { ArtworkRepository } from "../inventory/artworkRepository";
import { InventoryService } from "../inventory/inventoryService";

/** Opens the inventory stored in `dataDir`, as the app does on startup. */
export function openInventory(dataDir: string, now?: () => Date) {
  mkdirSync(dataDir, { recursive: true });
  const db = openDatabase(join(dataDir, "artgallery.sqlite"));
  const images = new ImageStore(join(dataDir, "images"));
  const exhibitionRepository = new ExhibitionRepository(db);
  const service = new InventoryService({
    artworks: new ArtworkRepository(db),
    exhibitions: exhibitionRepository,
    images,
    now,
  });
  const exhibitions = new ExhibitionService(exhibitionRepository, now);
  return { db, images, service, exhibitions };
}
