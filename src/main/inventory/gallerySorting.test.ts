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
