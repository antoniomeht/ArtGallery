import { describe, expect, it } from "vitest";
import { moveItem } from "./reorder";

describe("moving an artwork within the exhibition order", () => {
  it("puts it at the place it was dropped", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("leaves the order alone when dropped where it was", () => {
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
});
