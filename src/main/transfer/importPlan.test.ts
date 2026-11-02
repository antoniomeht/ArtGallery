import { describe, expect, it } from "vitest";
import { artworkFieldsSchema } from "../../shared/artwork";
import type { PackageArtwork } from "../package/packageFormat";
import { planImport, resolveImport } from "./importPlan";

const artwork = (id: string, deletedAt: string | null = null) =>
  ({
    ...artworkFieldsSchema.parse({ title: id }),
    id,
    createdAt: "2020-01-01T00:00:00.000Z",
    updatedAt: "2020-01-01T00:00:00.000Z",
    deletedAt,
    images: [],
  }) satisfies PackageArtwork;

describe("import plan", () => {
  const plan = planImport(
    [
      artwork("new"),
      artwork("existing"),
      artwork("new"),
      artwork("trashed", "2026-01-01T00:00:00.000Z"),
    ],
    new Set(["existing"]),
  );

  it("separates new artworks, duplicates and trashed ones", () => {
    expect(plan.fresh.map(({ id }) => id)).toEqual(["new"]);
    expect(plan.duplicates.map(({ id }) => id)).toEqual(["existing"]);
    expect(plan.trashedSkipped).toBe(1);
  });

  it("applies each duplicate policy", () => {
    const options = { newId: () => "copy-id", now: new Date("2026-11-02") };

    expect(resolveImport(plan, "skip", options)).toMatchObject({
      added: 1,
      skipped: 1,
    });
    expect(
      resolveImport(plan, "replace", options).artworks.map(({ id }) => id),
    ).toEqual(["new", "existing"]);

    const copied = resolveImport(plan, "copy", options);
    expect(copied.artworks.map(({ id }) => id)).toEqual(["new", "copy-id"]);
    expect(copied.artworks[1]?.createdAt).toBe("2026-11-02T00:00:00.000Z");
    expect(copied.added).toBe(2);
  });
});
