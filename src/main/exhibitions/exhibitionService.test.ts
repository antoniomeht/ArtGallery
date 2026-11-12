import { describe, expect, it } from "vitest";
import { defaultLabelTemplate } from "../../shared/labels";
import { useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";

async function inventoryWith(titles: string[]) {
  const inventory = openInventory(await useTempDir());
  const ids: string[] = [];
  for (const title of titles) {
    ids.push(
      (await inventory.service.createArtwork({ title, imagePaths: [] })).id,
    );
  }
  return { ...inventory, ids };
}

const titlesOf = (artworks: { title: string }[]) =>
  artworks.map(({ title }) => title);

describe("exhibitions", () => {
  it("keeps the artworks in the chosen order", async () => {
    const { db, exhibitions, ids } = await inventoryWith([
      "Marina",
      "Retrato",
      "Bodegón",
    ]);
    const { id } = exhibitions.create({
      name: "Mar y retratos",
      venue: "Sala Norte",
      startDate: "2026-03-12",
      endDate: "2026-04-30",
    });

    exhibitions.addArtworks(id, [ids[2]!, ids[0]!]);
    exhibitions.addArtworks(id, [ids[0]!, ids[1]!]);
    expect(titlesOf(exhibitions.get(id).artworks)).toEqual([
      "Bodegón",
      "Marina",
      "Retrato",
    ]);

    const reordered = exhibitions.setArtworks(id, [ids[1]!, ids[2]!]);
    expect(titlesOf(reordered.artworks)).toEqual(["Retrato", "Bodegón"]);
    expect(exhibitions.list()).toMatchObject([
      { name: "Mar y retratos", venue: "Sala Norte", artworkCount: 2 },
    ]);
    db.close();
  });

  it("leaves out trashed artworks and drops deleted ones", async () => {
    const { db, exhibitions, service, ids } = await inventoryWith([
      "Marina",
      "Retrato",
    ]);
    const { id } = exhibitions.create({ name: "Colección" });
    exhibitions.addArtworks(id, ids);

    service.moveToTrash([ids[0]!]);
    expect(titlesOf(exhibitions.get(id).artworks)).toEqual(["Retrato"]);

    service.restoreFromTrash([ids[0]!]);
    expect(titlesOf(exhibitions.get(id).artworks)).toEqual([
      "Marina",
      "Retrato",
    ]);

    service.moveToTrash([ids[0]!]);
    await service.deleteFromTrash([ids[0]!]);
    expect(exhibitions.get(id).artworkIds).toEqual([ids[1]]);
    db.close();
  });

  it("deletes an exhibition without touching its artworks", async () => {
    const { db, exhibitions, service, ids } = await inventoryWith(["Marina"]);
    const { id } = exhibitions.create({ name: "Colección" });
    exhibitions.addArtworks(id, ids);

    exhibitions.delete(id);

    expect(exhibitions.list()).toEqual([]);
    expect(titlesOf(service.listArtworks())).toEqual(["Marina"]);
    db.close();
  });

  it("validates names and date ranges", async () => {
    const { db, exhibitions } = await inventoryWith([]);

    expect(() => exhibitions.create({ name: "  " })).toThrow();
    expect(() =>
      exhibitions.create({
        name: "Al revés",
        startDate: "2026-05-01",
        endDate: "2026-04-01",
      }),
    ).toThrow();
    expect(
      exhibitions.create({ name: "Sin fechas", startDate: "", endDate: "" }),
    ).toMatchObject({ startDate: null, endDate: null });
    db.close();
  });

  it("keeps the label design of each exhibition", async () => {
    const { db, exhibitions } = await inventoryWith([]);
    const { id } = exhibitions.create({ name: "Mareas" });
    expect(exhibitions.get(id).labelTemplate).toBeNull();

    const template = defaultLabelTemplate({ widthMm: 90, heightMm: 50 });
    exhibitions.saveLabelTemplate(id, template);

    expect(exhibitions.get(id).labelTemplate).toEqual(template);
    expect(() =>
      exhibitions.saveLabelTemplate(id, { ...template, elements: [] }),
    ).toThrow();
    expect(() => exhibitions.saveLabelTemplate("missing", template)).toThrow();
    db.close();
  });
});
