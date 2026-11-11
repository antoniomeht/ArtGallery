import { describe, expect, it } from "vitest";
import { navigationStep, neighbourId } from "./recordNavigation";

const ids = ["a", "b", "c"];

describe("neighbourId", () => {
  it("moves to the next and previous artwork", () => {
    expect(neighbourId(ids, "b", 1)).toBe("c");
    expect(neighbourId(ids, "b", -1)).toBe("a");
  });

  it("stops at both ends instead of wrapping around", () => {
    expect(neighbourId(ids, "c", 1)).toBeNull();
    expect(neighbourId(ids, "a", -1)).toBeNull();
  });

  it("has no neighbour for an artwork no longer in the list", () => {
    expect(neighbourId(ids, "z", 1)).toBeNull();
  });
});

describe("keys that move to the neighbour artwork", () => {
  const plain = { inField: false, alt: false, other: false };

  it("are the bare arrows outside the fields", () => {
    expect(navigationStep("ArrowRight", plain)).toBe(1);
    expect(navigationStep("ArrowLeft", plain)).toBe(-1);
    expect(navigationStep("Enter", plain)).toBe(0);
    expect(navigationStep("ArrowRight", { ...plain, other: true })).toBe(0);
  });

  it("need Alt inside a field, where bare arrows move the cursor", () => {
    expect(navigationStep("ArrowRight", { ...plain, inField: true })).toBe(0);
    expect(
      navigationStep("ArrowLeft", { ...plain, inField: true, alt: true }),
    ).toBe(-1);
  });
});
