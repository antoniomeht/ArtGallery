import { describe, expect, it } from "vitest";
import { neighbourId } from "./recordNavigation";

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
