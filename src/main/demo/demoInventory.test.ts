import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";
import { seedDemoInventory } from "./demoInventory";

describe("demo inventory", () => {
  it("fills an empty inventory once, with images and an exhibition", async () => {
    const dataDir = await useTempDir();
    const { db, service, exhibitions } = openInventory(dataDir);
    const options = {
      inventory: service,
      exhibitions,
      workDir: join(dataDir, "demo-images"),
    };

    await seedDemoInventory(options);
    await seedDemoInventory(options);

    const artworks = service.listArtworks();
    expect(artworks).toHaveLength(8);
    expect(artworks.every((artwork) => artwork.primaryImageId)).toBe(true);
    expect(exhibitions.list()).toMatchObject([
      { name: "Geometrías del color", artworkCount: 4 },
    ]);
    db.close();
  });
});
