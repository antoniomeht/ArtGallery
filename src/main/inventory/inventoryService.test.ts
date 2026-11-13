import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ArtworkSummary, CreationProgress } from "../../shared/artwork";
import { fromSingleUnit } from "../../shared/dimensions";
import { createTestImage, listFiles, useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";
import { InventoryNumberTakenError } from "./inventoryService";

describe("InventoryService", () => {
  it("finds an artwork with its image after the app is reopened", async () => {
    const dataDir = await useTempDir();
    const photo = await createTestImage(join(dataDir, "photo.jpg"));

    const session = openInventory(dataDir);
    const created = await session.service.createArtwork({
      title: "Bodegón con limones",
      artist: "Ana Ruiz",
      imagePaths: [photo],
    });
    session.db.close();

    const reopened = openInventory(dataDir);
    expect(reopened.service.listArtworks()).toEqual([created]);
    expect(created.primaryImageId).not.toBeNull();
    reopened.db.close();
  });

  it("creates one artwork per image, named after the file", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const first = await createTestImage(join(dataDir, "IMG_2034.jpg"));
    const second = await createTestImage(join(dataDir, "Bodegón final.png"));

    const created = await service.createArtworksFromImages(
      [first, second],
      "Ana Ruiz",
    );

    expect(created.map(({ title }) => title)).toEqual([
      "IMG_2034",
      "Bodegón final",
    ]);
    const [{ id, primaryImageId }] = created as [ArtworkSummary];
    const stored = service.getArtwork(id);
    expect(stored).toMatchObject({ artist: "Ana Ruiz" });
    expect(stored.images.map((image) => image.id)).toEqual([primaryImageId]);
    db.close();
  });

  it("reports progress before importing each image", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const first = await createTestImage(join(dataDir, "first.jpg"));
    const second = await createTestImage(join(dataDir, "second.png"));
    const progress: CreationProgress[] = [];

    await service.createArtworksFromImages([first, second], "", (step) =>
      progress.push(step),
    );

    expect(progress).toEqual([
      { done: 0, total: 2, fileName: "first.jpg" },
      { done: 1, total: 2, fileName: "second.png" },
    ]);
    db.close();
  });

  it("marks artworks created from images for review", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const photo = await createTestImage(join(dataDir, "photo.jpg"));

    const [created] = (await service.createArtworksFromImages([photo], "")) as [
      ArtworkSummary,
    ];

    expect(created.needsReview).toBe(true);
    expect(service.listArtworks()[0]?.needsReview).toBe(true);
    expect(service.getArtwork(created.id).needsReview).toBe(true);

    service.updateArtwork(created.id, { title: "Marina" });

    expect(service.listArtworks()[0]?.needsReview).toBe(false);
    expect(service.getArtwork(created.id).needsReview).toBe(false);
    db.close();
  });

  it("keeps the review mark the user sets when saving", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const { id } = await service.createArtwork({
      title: "Marina",
      imagePaths: [],
    });

    service.updateArtwork(id, { title: "Marina", needsReview: true });

    expect(service.getArtwork(id).needsReview).toBe(true);
    expect(service.listArtworks()[0]?.needsReview).toBe(true);
    db.close();
  });

  it("leaves the artist empty without a default", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const photo = await createTestImage(join(dataDir, "photo.jpg"));

    const created = await service.createArtworksFromImages([photo], "");
    const [{ id }] = created as [ArtworkSummary];

    expect(service.getArtwork(id).artist).toBeNull();
    db.close();
  });

  it("creates nothing when one of the images cannot be imported", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const valid = await createTestImage(join(dataDir, "valid.jpg"));
    const broken = join(dataDir, "broken.jpg");
    await writeFile(broken, "not an image");

    await expect(
      service.createArtworksFromImages([valid, broken], "Ana Ruiz"),
    ).rejects.toThrow();

    expect(service.listArtworks()).toEqual([]);
    expect(await listFiles(join(dataDir, "images"))).toEqual([]);
    db.close();
  });

  it("uses the first image as the primary one", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const first = await createTestImage(join(dataDir, "first.png"));
    const second = await createTestImage(join(dataDir, "second.png"));

    await service.createArtwork({
      title: "Díptico",
      imagePaths: [first, second],
    });

    const rows = db
      .prepare("SELECT id, position FROM artwork_images ORDER BY position")
      .all() as { id: string }[];
    expect(service.listArtworks()[0]?.primaryImageId).toBe(rows[0]?.id);
    db.close();
  });

  it("saves nothing when one of the images is invalid", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const valid = await createTestImage(join(dataDir, "valid.jpg"));
    const broken = join(dataDir, "broken.jpg");
    await writeFile(broken, "corrupted");

    await expect(
      service.createArtwork({ title: "Serie", imagePaths: [valid, broken] }),
    ).rejects.toThrow();

    expect(service.listArtworks()).toEqual([]);
    expect(await listFiles(join(dataDir, "images"))).toEqual([]);
    db.close();
  });

  it("saves every field of the artwork record", async () => {
    const dataDir = await useTempDir();
    const session = openInventory(dataDir);
    const { id } = await session.service.createArtwork({
      title: "Marina",
      imagePaths: [],
    });

    session.service.updateArtwork(id, {
      title: "Marina al atardecer",
      inventoryNumber: " 007 ",
      artist: "Ana Ruiz",
      category: "Pintura",
      technique: "Óleo",
      support: "Lienzo",
      year: 1998,
      yearApproximate: true,
      dimensions: fromSingleUnit({ height: 65, width: 81, depth: 3.5 }, "cm"),
      description: "Vista del puerto.",
      notes: "Marco original.",
      tags: ["mar", "puerto", "mar"],
      location: "Salón",
      status: "loaned",
      price: 1250.5,
      currency: "EUR",
    });
    session.db.close();

    const reopened = openInventory(dataDir);
    expect(reopened.service.getArtwork(id)).toMatchObject({
      title: "Marina al atardecer",
      inventoryNumber: "007",
      artist: "Ana Ruiz",
      year: 1998,
      yearApproximate: true,
      dimensions: { cm: { height: 65, width: 81, depth: 3.5 } },
      tags: ["mar", "puerto"],
      status: "loaned",
      price: 1250.5,
    });
    reopened.db.close();
  });

  it("refuses an inventory number another artwork has, the trash included", async () => {
    const { db, service } = openInventory(await useTempDir());
    const create = async (inventoryNumber: string) => {
      const { id } = await service.createArtwork({
        title: "Obra",
        imagePaths: [],
      });
      service.updateArtwork(id, { title: "Obra", inventoryNumber });
      return id;
    };
    const marina = await create("A-7");
    const boceto = await create("008");
    service.moveToTrash([boceto]);
    const nueva = await create("009");

    for (const taken of ["A-7", " a-7 ", "008"]) {
      expect(() =>
        service.updateArtwork(nueva, { title: "Obra", inventoryNumber: taken }),
      ).toThrow(InventoryNumberTakenError);
    }
    expect(service.getArtwork(nueva).inventoryNumber).toBe("009");
    // Saving an artwork again keeps its own number.
    expect(
      service.updateArtwork(marina, {
        title: "Marina",
        inventoryNumber: "A-7",
      }),
    ).toMatchObject({ title: "Marina", inventoryNumber: "A-7" });
    db.close();
  });

  it("names the artwork that has a number, the same in value or any case", async () => {
    const { db, service } = openInventory(await useTempDir());
    const create = async (title: string, inventoryNumber: string) => {
      const { id } = await service.createArtwork({ title, imagePaths: [] });
      service.updateArtwork(id, { title, inventoryNumber });
      return id;
    };
    const marina = await create("Marina", "003");
    const boceto = await create("Boceto", "A-7");
    service.moveToTrash([boceto]);
    const nueva = await create("Nueva", "010");

    expect(service.inventoryNumberOwner("3", nueva)).toEqual({
      id: marina,
      title: "Marina",
      inTrash: false,
    });
    expect(service.inventoryNumberOwner(" a-7 ", nueva)).toMatchObject({
      title: "Boceto",
      inTrash: true,
    });
    expect(service.inventoryNumberOwner("3", marina)).toBeNull();
    expect(service.inventoryNumberOwner("4", nueva)).toBeNull();
    expect(() =>
      service.updateArtwork(nueva, { title: "Nueva", inventoryNumber: "3" }),
    ).toThrow(InventoryNumberTakenError);
    db.close();
  });

  it("writes short numbers with three digits", async () => {
    const { db, service } = openInventory(await useTempDir());
    const { id } = await service.createArtwork({
      title: "Marina",
      imagePaths: [],
    });
    const number = (inventoryNumber: string) =>
      service.updateArtwork(id, { title: "Marina", inventoryNumber })
        .inventoryNumber;

    expect(number(" 2 ")).toBe("002");
    expect(number("1500")).toBe("1500");
    expect(number("A-7")).toBe("A-7");
    db.close();
  });

  it("swaps numbers when taking one another artwork has", async () => {
    const { db, service } = openInventory(await useTempDir());
    const create = async (title: string, inventoryNumber?: string) => {
      const { id } = await service.createArtwork({ title, imagePaths: [] });
      if (inventoryNumber)
        service.updateArtwork(id, { title, inventoryNumber });
      return id;
    };
    const marina = await create("Marina", "003");
    const retrato = await create("Retrato", "005");
    const boceto = await create("Boceto");
    const take = { takeInventoryNumber: true };

    service.updateArtwork(
      retrato,
      { title: "Retrato", inventoryNumber: "003" },
      take,
    );
    expect(service.getArtwork(retrato).inventoryNumber).toBe("003");
    expect(service.getArtwork(marina).inventoryNumber).toBe("005");

    // Without a number of its own, the other artwork is left without one.
    service.updateArtwork(
      boceto,
      { title: "Boceto", inventoryNumber: "005" },
      take,
    );
    expect(service.getArtwork(boceto).inventoryNumber).toBe("005");
    expect(service.getArtwork(marina).inventoryNumber).toBeNull();
    db.close();
  });

  it("offers the next free number of the technique, counting the trash", async () => {
    const { db, service } = openInventory(await useTempDir());
    const ranges = [{ technique: "Óleo", from: 1, to: 199 }];
    for (const inventoryNumber of ["001", "002"]) {
      const { id } = await service.createArtwork({
        title: "Marina",
        imagePaths: [],
      });
      service.updateArtwork(id, { title: "Marina", inventoryNumber });
      if (inventoryNumber === "002") service.moveToTrash([id]);
    }

    expect(service.nextInventoryNumber(ranges, "óleo")).toBe("003");
    expect(service.nextInventoryNumber(ranges, "Acuarela")).toBe("003");
    db.close();
  });

  it("stores blank optional fields as empty", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const { id } = await service.createArtwork({
      title: "Boceto",
      imagePaths: [],
    });

    const updated = service.updateArtwork(id, {
      title: "Boceto",
      artist: "   ",
      notes: "",
    });

    expect(updated).toMatchObject({ artist: null, notes: null, price: null });
    db.close();
  });

  it("rejects invalid values without changing the artwork", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);
    const { id } = await service.createArtwork({
      title: "Boceto",
      imagePaths: [],
    });

    expect(() =>
      service.updateArtwork(id, {
        title: "Boceto",
        dimensions: { cm: { height: -10 } },
      }),
    ).toThrow();
    expect(() =>
      service.updateArtwork(id, { title: "Boceto", currency: "euros" }),
    ).toThrow();
    expect(service.getArtwork(id).dimensions.cm.height).toBeNull();
    db.close();
  });

  it("reports when the artwork does not exist", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);

    expect(() => service.updateArtwork("missing", { title: "X" })).toThrow(
      /not found/,
    );
    db.close();
  });

  it("requires a title", async () => {
    const dataDir = await useTempDir();
    const { db, service } = openInventory(dataDir);

    await expect(
      service.createArtwork({ title: "   ", imagePaths: [] }),
    ).rejects.toThrow();
    db.close();
  });
});
