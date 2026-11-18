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
    numberedArtworks: [],
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

describe("inventory numbers on import", () => {
  const numbered = (id: string, inventoryNumber: string) => ({
    ...artwork(id),
    inventoryNumber,
  });
  const resolve = (
    artworks: PackageArtwork[],
    policy: "skip" | "replace" | "copy",
    numberedArtworks: { id: string; inventoryNumber: string }[],
  ) => {
    let nextId = 0;
    const plan = planImport(
      { artworks, exhibitions: [] },
      {
        artworkIds: new Set(numberedArtworks.map(({ id }) => id)),
        exhibitionIds: new Set(),
      },
    );
    return resolveImport(plan, policy, {
      newId: () => `copy-${++nextId}`,
      now: new Date("2026-11-18"),
      numberedArtworks,
    });
  };
  const numbers = ({ artworks }: { artworks: PackageArtwork[] }) =>
    artworks.map(({ id, inventoryNumber, needsReview }) => ({
      id,
      inventoryNumber,
      needsReview,
    }));

  it("keeps numbers nobody has", () => {
    const resolved = resolve([numbered("new", "008")], "skip", [
      { id: "local", inventoryNumber: "007" },
    ]);
    expect(numbers(resolved)).toEqual([
      { id: "new", inventoryNumber: "008", needsReview: false },
    ]);
    expect(resolved.withoutNumber).toBe(0);
  });

  it("leaves out a number another artwork has, by value, for review", () => {
    const resolved = resolve([numbered("new", "007")], "skip", [
      { id: "local", inventoryNumber: "0007" },
    ]);
    expect(numbers(resolved)).toEqual([
      { id: "new", inventoryNumber: null, needsReview: true },
    ]);
    expect(resolved.withoutNumber).toBe(1);
  });

  it("leaves copies without the number of their original", () => {
    const resolved = resolve([numbered("local", "007")], "copy", [
      { id: "local", inventoryNumber: "007" },
    ]);
    expect(numbers(resolved)).toEqual([
      { id: "copy-1", inventoryNumber: null, needsReview: true },
    ]);
  });

  it("frees the number of a replaced artwork", () => {
    const resolved = resolve(
      [numbered("local", "009"), numbered("new", "007")],
      "replace",
      [{ id: "local", inventoryNumber: "007" }],
    );
    expect(numbers(resolved)).toEqual([
      { id: "new", inventoryNumber: "007", needsReview: false },
      { id: "local", inventoryNumber: "009", needsReview: false },
    ]);
  });

  it("keeps the number of a replaced artwork that brings it back", () => {
    const resolved = resolve([numbered("local", "007")], "replace", [
      { id: "local", inventoryNumber: "007" },
    ]);
    expect(resolved.withoutNumber).toBe(0);
  });

  it("gives a number only once within the package", () => {
    const resolved = resolve(
      [numbered("first", "007"), numbered("second", "7")],
      "skip",
      [],
    );
    expect(
      numbers(resolved).map(({ inventoryNumber }) => inventoryNumber),
    ).toEqual(["007", null]);
  });
});
