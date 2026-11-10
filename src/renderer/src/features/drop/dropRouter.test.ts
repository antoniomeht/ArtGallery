import { describe, expect, it } from "vitest";
import { dropTargetValue, parseDropTarget, routeDrop } from "./dropRouter";

describe("drop routing", () => {
  it("sends images to artworks and everything else to documents", () => {
    expect(
      routeDrop(
        ["C:\\a.jpg", "C:\\b.PDF", "C:\\c.exe", "C:\\d.tif"],
        "gallery",
      ),
    ).toEqual({
      images: ["C:\\a.jpg", "C:\\d.tif"],
      documents: ["C:\\b.PDF", "C:\\c.exe"],
    });
  });

  it("sends images to documents on the Documentación page", () => {
    expect(routeDrop(["/x/factura.jpg", "/x/acta.pdf"], "documents")).toEqual({
      images: [],
      documents: ["/x/factura.jpg", "/x/acta.pdf"],
    });
  });

  it("reads link targets from their attribute", () => {
    const value = dropTargetValue({ type: "collection", id: "c-1" });

    expect(value).toBe("collection:c-1");
    expect(parseDropTarget(value)).toEqual({ type: "collection", id: "c-1" });
    expect(parseDropTarget("artwork:9f1c")).toEqual({
      type: "artwork",
      id: "9f1c",
    });
    expect(parseDropTarget("printer:1")).toBeNull();
    expect(parseDropTarget("artwork:")).toBeNull();
    expect(parseDropTarget(null)).toBeNull();
  });
});
