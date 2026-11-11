import { describe, expect, it } from "vitest";
import { nextField } from "./formNavigation";

describe("moving through the form with Enter", () => {
  it("goes to the field after the current one", () => {
    expect(nextField(["title", "artist", "category"], "artist")).toBe(
      "category",
    );
  });

  it("stays put on the last field or one it does not know", () => {
    expect(nextField(["title", "artist"], "artist")).toBeNull();
    expect(nextField(["title", "artist"], "price")).toBeNull();
  });
});
