import { describe, expect, it } from "vitest";
import { pageCss, pageSetupSchema, pageSize } from "./pageSetup";
import { printJobSchema } from "./print";

describe("page setup", () => {
  it("defaults to A4, portrait, normal margins and page numbers", () => {
    expect(pageSetupSchema.parse({})).toEqual({
      size: "A4",
      orientation: "portrait",
      margins: "normal",
      header: "",
      pageNumbers: true,
    });
  });

  it("writes the CSS page rule", () => {
    expect(pageCss(pageSetupSchema.parse({}))).toBe(
      "@page { size: A4 portrait; margin: 25mm; }",
    );
    expect(
      pageCss(
        pageSetupSchema.parse({
          size: "Letter",
          orientation: "landscape",
          margins: "narrow",
        }),
      ),
    ).toBe("@page { size: letter landscape; margin: 12.7mm; }");
  });

  it("gives the sheet size in millimetres", () => {
    expect(pageSize(pageSetupSchema.parse({}))).toEqual({
      width: 210,
      height: 297,
    });
    expect(
      pageSize(
        pageSetupSchema.parse({ size: "Letter", orientation: "landscape" }),
      ),
    ).toEqual({ width: 279.4, height: 215.9 });
  });

  it("refuses a header that is too long", () => {
    expect(() => pageSetupSchema.parse({ header: "x".repeat(201) })).toThrow();
  });

  it("prints text documents", () => {
    expect(
      printJobSchema.parse({ kind: "document", documentId: "d1" }),
    ).toEqual({
      kind: "document",
      documentId: "d1",
    });
  });
});
