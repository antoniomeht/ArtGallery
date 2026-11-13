import { describe, expect, it } from "vitest";
import type { ArtworkSort } from "../../shared/artwork";
import { useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";

async function createArtworks(
  dataDir: string,
  artworks: { title: string; year?: number; technique?: string }[],
) {
  // A clock that advances one minute per call keeps creation order stable.
  let clock = Date.parse("2026-01-01T00:00:00Z");
  const { db, service } = openInventory(
    dataDir,
    () => new Date((clock += 60_000)),
  );
  for (const { title, year, technique } of artworks) {
    const { id } = await service.createArtwork({ title, imagePaths: [] });
    if (year || technique)
      service.updateArtwork(id, { title, year, technique });
  }
  return { db, service };
}

describe("gallery sorting and bulk changes", () => {
  it("sorts by year, technique, date added and title", async () => {
    const { db, service } = await createArtworks(await useTempDir(), [
      { title: "zócalo", year: 1990, technique: "óleo" },
      { title: "Ángel", year: 1975, technique: "Acuarela" },
      { title: "Bodegón" },
      { title: "árbol", year: 2001, technique: "Óleo" },
      { title: "Marina", year: 1990 },
    ]);
    const titles = (sort?: ArtworkSort) =>
      service.listArtworks({ sort }).map((artwork) => artwork.title);

    // Newest year first by default; artworks without a year go last.
    expect(titles()).toEqual(["árbol", "Marina", "zócalo", "Ángel", "Bodegón"]);
    expect(titles("year-asc")).toEqual([
      "Ángel",
      "Marina",
      "zócalo",
      "árbol",
      "Bodegón",
    ]);
    // Techniques A–Z ignoring accents and case, then newest year first.
    expect(titles("technique")).toEqual([
      "Ángel",
      "árbol",
      "zócalo",
      "Marina",
      "Bodegón",
    ]);
    expect(titles("recent")).toEqual([
      "Marina",
      "árbol",
      "Bodegón",
      "Ángel",
      "zócalo",
    ]);
    expect(titles("title")).toEqual([
      "Ángel",
      "árbol",
      "Bodegón",
      "Marina",
      "zócalo",
    ]);
    expect(service.listArtworks()[0]).toMatchObject({
      year: 2001,
      technique: "Óleo",
    });
    db.close();
  });

  it("puts favourites first within their year or technique only", async () => {
    const { db, service } = await createArtworks(await useTempDir(), [
      { title: "Bodegón", year: 2001, technique: "Óleo" },
      { title: "Marina", year: 1990, technique: "Óleo" },
      { title: "Retrato", year: 2001, technique: "Óleo" },
      { title: "Árbol", year: 1980, technique: "Acuarela" },
    ]);
    const id = (title: string) =>
      service.listArtworks().find((artwork) => artwork.title === title)!.id;
    service.setFavorite(id("Retrato"), true);
    service.setFavorite(id("Marina"), true);
    const titles = (sort?: ArtworkSort) =>
      service.listArtworks({ sort }).map((artwork) => artwork.title);

    expect(titles()).toEqual(["Retrato", "Bodegón", "Marina", "Árbol"]);
    expect(titles("technique")).toEqual([
      "Árbol",
      "Retrato",
      "Marina",
      "Bodegón",
    ]);
    // Date added gives favourites no priority.
    expect(titles("recent")).toEqual(["Árbol", "Retrato", "Marina", "Bodegón"]);
    db.close();
  });

  it("keeps an artwork favourite when its record is saved", async () => {
    const { db, service } = await createArtworks(await useTempDir(), [
      { title: "Marina" },
    ]);
    const [marina] = service.listArtworks();
    service.setFavorite(marina!.id, true);

    service.updateArtwork(marina!.id, { title: "Marina azul" });

    expect(service.getArtwork(marina!.id).favorite).toBe(true);
    db.close();
  });

  it("rejects unknown sort orders", async () => {
    const { db, service } = await createArtworks(await useTempDir(), []);

    expect(() =>
      service.listArtworks({
        sort: "price; DROP TABLE artworks" as ArtworkSort,
      }),
    ).toThrow();
    db.close();
  });

  it("changes the status of several artworks at once", async () => {
    const { db, service } = await createArtworks(await useTempDir(), [
      { title: "Marina" },
      { title: "Retrato" },
      { title: "Bodegón" },
    ]);
    const [first, second, third] = service.listArtworks();

    service.setStatus([first!.id, second!.id], "loaned");

    expect(service.getArtwork(first!.id).status).toBe("loaned");
    expect(service.getArtwork(second!.id).status).toBe("loaned");
    expect(service.getArtwork(third!.id).status).toBe("available");
    db.close();
  });
});
