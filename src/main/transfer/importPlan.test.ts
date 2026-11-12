import { describe, expect, it } from "vitest";
import { artworkFieldsSchema } from "../../shared/artwork";
import type {
  PackageArtwork,
  PackageExhibition,
} from "../package/packageFormat";
import { planImport, resolveImport } from "./importPlan";

const DATE = "2020-01-01T00:00:00.000Z";

const artwork = (id: string, deletedAt: string | null = null) =>
  ({
    ...artworkFieldsSchema.parse({ title: id }),
    id,
    createdAt: DATE,
    updatedAt: DATE,
    deletedAt,
    needsReview: false,
    favorite: false,
    images: [],
  }) satisfies PackageArtwork;

const exhibition = (id: string, artworkIds: string[]): PackageExhibition => ({
  id,
  name: id,
  venue: null,
  labelTemplate: null,
  startDate: null,
  endDate: null,
  description: null,
  artworkIds,
  createdAt: DATE,
  updatedAt: DATE,
});

describe("import plan", () => {
  const plan = planImport(
    {
      artworks: [
        artwork("new"),
        artwork("existing"),
        artwork("new"),
        artwork("trashed", "2026-01-01T00:00:00.000Z"),
      ],
      exhibitions: [
        exhibition("new-show", ["new", "existing"]),
        exhibition("old-show", ["existing"]),
      ],
    },
    {
      artworkIds: new Set(["existing"]),
      exhibitionIds: new Set(["old-show"]),
    },
  );
  let nextId = 0;
  const options = {
    newId: () => `copy-${++nextId}`,
    now: new Date("2026-11-02"),
  };

  it("separates new items, duplicates and trashed artworks", () => {
    expect(plan.fresh.map(({ id }) => id)).toEqual(["new"]);
    expect(plan.duplicates.map(({ id }) => id)).toEqual(["existing"]);
    expect(plan.trashedSkipped).toBe(1);
    expect(plan.freshExhibitions.map(({ id }) => id)).toEqual(["new-show"]);
    expect(plan.duplicateExhibitions.map(({ id }) => id)).toEqual(["old-show"]);
  });

  it("skips or replaces duplicates", () => {
    const skipped = resolveImport(plan, "skip", options);
    expect(skipped).toMatchObject({ added: 1, skipped: 1 });
    expect(skipped.exhibitions.map(({ id }) => id)).toEqual(["new-show"]);

    const replaced = resolveImport(plan, "replace", options);
    expect(replaced.artworks.map(({ id }) => id)).toEqual(["new", "existing"]);
    expect(replaced.exhibitions.map(({ id }) => id)).toEqual([
      "new-show",
      "old-show",
    ]);
  });

  it("points exhibitions at copied artworks", () => {
    nextId = 0;
    const copied = resolveImport(plan, "copy", options);

    expect(copied.artworks.map(({ id }) => id)).toEqual(["new", "copy-1"]);
    expect(copied.artworks[1]?.createdAt).toBe("2026-11-02T00:00:00.000Z");
    expect(copied.added).toBe(2);
    expect(copied.exhibitions).toMatchObject([
      { id: "new-show", artworkIds: ["new", "copy-1"] },
      { id: "copy-2", artworkIds: ["copy-1"] },
    ]);
  });
});
