import { beforeEach, describe, expect, it } from "vitest";
import type { ArtworkFieldsInput, ArtworkQuery } from "../../shared/artwork";
import { useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";
import type { InventoryService } from "./inventoryService";

const ARTWORKS: ArtworkFieldsInput[] = [
  {
    title: "Marina al atardecer",
    artist: "Lucía Ferrer",
    category: "Pintura",
    technique: "Óleo",
    support: "Lienzo",
    year: 1998,
    tags: ["mar", "puerto"],
    location: "Salón",
    status: "available",
  },
  {
    title: "Retrato de Ana",
    artist: "Lucía Ferrer",
    category: "Dibujo",
    technique: "Carboncillo",
    year: 2005,
    tags: ["retrato"],
    location: "Estudio",
    status: "loaned",
    notes: "Prestado al 100% para la muestra",
  },
  {
    title: "Puerto de noche",
    artist: "Tomás Gil",
    category: "pintura",
    technique: "óleo",
    year: 2015,
    tags: ["Puerto"],
    location: "Almacén",
    status: "sold",
  },
];

describe("search and filters", () => {
  let service: InventoryService;
  let close: () => void;

  beforeEach(async () => {
    const inventory = openInventory(await useTempDir());
    service = inventory.service;
    close = () => inventory.db.close();
    for (const fields of ARTWORKS) {
      const { id } = await service.createArtwork({
        title: fields.title,
        imagePaths: [],
      });
      service.updateArtwork(id, fields);
    }
    return () => close();
  });

  const titles = (query: ArtworkQuery) =>
    service
      .listArtworks({ sort: "title", ...query })
      .map((artwork) => artwork.title);

  it("finds text in any field ignoring accents and case", () => {
    expect(titles({ text: "LUCIA" })).toEqual([
      "Marina al atardecer",
      "Retrato de Ana",
    ]);
    expect(titles({ text: "salon" })).toEqual(["Marina al atardecer"]);
    expect(titles({ text: "carbon" })).toEqual(["Retrato de Ana"]);
    expect(titles({ text: "puerto" })).toEqual([
      "Marina al atardecer",
      "Puerto de noche",
    ]);
  });

  it("requires every word of the text to match", () => {
    expect(titles({ text: "oleo tomas" })).toEqual(["Puerto de noche"]);
    expect(titles({ text: "oleo carboncillo" })).toEqual([]);
  });

  it("treats % and _ in the text as plain characters", () => {
    expect(titles({ text: "100%" })).toEqual(["Retrato de Ana"]);
    expect(titles({ text: "%" })).toEqual(["Retrato de Ana"]);
    expect(titles({ text: "_" })).toEqual([]);
  });

  it("combines filters with each other and with the text", () => {
    expect(titles({ category: "Pintura" })).toEqual([
      "Marina al atardecer",
      "Puerto de noche",
    ]);
    expect(titles({ category: "pintura", statuses: ["sold"] })).toEqual([
      "Puerto de noche",
    ]);
    expect(titles({ tag: "puerto", yearTo: 2000 })).toEqual([
      "Marina al atardecer",
    ]);
    expect(
      titles({ artist: "Lucía Ferrer", statuses: ["available", "loaned"] }),
    ).toEqual(["Marina al atardecer", "Retrato de Ana"]);
    expect(titles({ yearFrom: 2000, yearTo: 2010 })).toEqual([
      "Retrato de Ana",
    ]);
    expect(titles({ text: "puerto", location: "Almacén" })).toEqual([
      "Puerto de noche",
    ]);
  });

  it("never returns artworks from the trash", () => {
    const [marina] = service.listArtworks({ text: "marina" });
    service.moveToTrash([marina!.id]);

    expect(titles({ text: "marina" })).toEqual([]);
    expect(service.listFilterOptions().locations).not.toContain("Salón");
  });

  it("offers each filter value once, whatever its accents or case", () => {
    const options = service.listFilterOptions();

    expect(options).toMatchObject({
      categories: ["Dibujo", "Pintura"],
      artists: ["Lucía Ferrer", "Tomás Gil"],
      techniques: ["Carboncillo", "Óleo"],
      locations: ["Almacén", "Estudio", "Salón"],
    });
    // "Puerto" and "puerto" are one tag; either spelling may be shown.
    expect(options.tags.map((tag) => tag.toLowerCase())).toEqual([
      "mar",
      "puerto",
      "retrato",
    ]);
  });
});
