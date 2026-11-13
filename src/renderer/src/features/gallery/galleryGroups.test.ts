import { describe, expect, it } from "vitest";
import type { ArtworkSummary } from "../../../../shared/artwork";
import { galleryGroups } from "./galleryGroups";

const artwork = (
  title: string,
  year: number | null,
  technique: string | null = null,
): ArtworkSummary => ({
  id: title,
  title,
  artist: null,
  primaryImageId: null,
  needsReview: false,
  favorite: false,
  year,
  technique,
  createdAt: "2026-01-01T00:00:00.000Z",
  deletedAt: null,
});

const titlesOf = (groups: ReturnType<typeof galleryGroups>) =>
  groups?.map(({ label, artworks }) => [label, artworks.map((a) => a.title)]);

describe("gallery groups", () => {
  it("divides the gallery by year, in the order given", () => {
    const groups = galleryGroups(
      [
        artwork("Retrato", 2021),
        artwork("Marina", 2019),
        artwork("Puerto", 2019),
        artwork("Boceto", null),
      ],
      "year-desc",
    );

    expect(titlesOf(groups)).toEqual([
      ["2021", ["Retrato"]],
      ["2019", ["Marina", "Puerto"]],
      ["Sin año", ["Boceto"]],
    ]);
  });

  it("divides by technique ignoring accents and case", () => {
    const groups = galleryGroups(
      [
        artwork("Ángel", 1975, "Acuarela"),
        artwork("Árbol", 2001, "Óleo"),
        artwork("Zócalo", 1990, "oleo "),
        artwork("Marina", 1990),
      ],
      "technique",
    );

    expect(titlesOf(groups)).toEqual([
      ["Acuarela", ["Ángel"]],
      ["Óleo", ["Árbol", "Zócalo"]],
      ["Sin técnica", ["Marina"]],
    ]);
  });

  it("never repeats a group, even for artworks in another order", () => {
    const groups = galleryGroups(
      [
        artwork("Retrato", 2021, "Óleo"),
        artwork("Marina", 2019, "Acuarela"),
        artwork("Puerto", 2019, "Óleo"),
      ],
      "technique",
    );

    expect(titlesOf(groups)).toEqual([
      ["Óleo", ["Retrato", "Puerto"]],
      ["Acuarela", ["Marina"]],
    ]);
  });

  it("leaves the gallery undivided when sorted by date added", () => {
    expect(galleryGroups([artwork("Marina", 2019)], "recent")).toBeNull();
  });
});
