import { describe, expect, it } from "vitest";
import type { ArtworkSort } from "../../shared/artwork";
import { useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";

async function createArtworks(
  dataDir: string,
  artworks: { title: string; year?: number }[],
) {
  // A clock that advances one minute per call keeps creation order stable.
  let clock = Date.parse("2026-01-01T00:00:00Z");
  const { db, service } = openInventory(
    dataDir,
    () => new Date((clock += 60_000)),
  );
  for (const { title, year } of artworks) {
    const { id } = await service.createArtwork({ title, imagePaths: [] });
    if (year) service.updateArtwork(id, { title, year });
  }
  return { db, service };
}

describe("gallery sorting and bulk changes", () => {
  it("sorts by date added, title and year", async () => {
    const { db, service } = await createArtworks(await useTempDir(), [
      { title: "zócalo", year: 1990 },
      { title: "Ángel", year: 1975 },
      { title: "Bodegón" },
      { title: "árbol", year: 2001 },
    ]);
    const titles = (sort: ArtworkSort) =>
      service.listArtworks({ sort }).map((artwork) => artwork.title);

    expect(titles("recent")).toEqual(["árbol", "Bodegón", "Ángel", "zócalo"]);
    expect(titles("oldest")).toEqual(["zócalo", "Ángel", "Bodegón", "árbol"]);
    expect(titles("title")).toEqual(["Ángel", "árbol", "Bodegón", "zócalo"]);
    // Artworks without a year go last in both directions.
    expect(titles("year-asc")).toEqual(["Ángel", "zócalo", "árbol", "Bodegón"]);
    expect(titles("year-desc")).toEqual([
      "árbol",
      "zócalo",
      "Ángel",
      "Bodegón",
    ]);
    db.close();
  });

  it("puts favourites first, newest first, in every order", async () => {
    const { db, service } = await createArtworks(await useTempDir(), [
      { title: "Bodegón", year: 2001 },
      { title: "Marina", year: 1990 },
      { title: "Retrato", year: 2010 },
      { title: "Árbol", year: 1980 },
    ]);
    const id = (title: string) =>
      service.listArtworks().find((artwork) => artwork.title === title)!.id;
    service.setFavorite(id("Bodegón"), true);
    service.setFavorite(id("Marina"), true);
    const titles = (sort?: ArtworkSort) =>
      service.listArtworks({ sort }).map((artwork) => artwork.title);

    expect(titles()).toEqual(["Marina", "Bodegón", "Árbol", "Retrato"]);
    expect(titles("title")).toEqual(["Bodegón", "Marina", "Árbol", "Retrato"]);
    expect(service.listArtworks()[0]!.favorite).toBe(true);

    service.setFavorite(id("Marina"), false);
    expect(titles()).toEqual(["Bodegón", "Árbol", "Retrato", "Marina"]);
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
