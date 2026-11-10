import { describe, expect, it } from "vitest";
import { membershipState } from "./membership";

describe("collection membership of a selection", () => {
  const members = new Set(["a", "b"]);

  it("is all when every selected artwork is in the collection", () => {
    expect(membershipState(["a", "b"], members)).toEqual({
      state: "all",
      count: 2,
    });
  });

  it("is some when only part of the selection is in it", () => {
    expect(membershipState(["a", "c", "d"], members)).toEqual({
      state: "some",
      count: 1,
    });
  });

  it("is none when no selected artwork is in it", () => {
    expect(membershipState(["c"], members)).toEqual({
      state: "none",
      count: 0,
    });
  });
});
