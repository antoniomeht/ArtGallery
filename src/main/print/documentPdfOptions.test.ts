import { describe, expect, it } from "vitest";
import { pageSetupSchema } from "../../shared/pageSetup";
import { documentPdfOptions } from "./documentPdfOptions";

describe("PDF header and footer of text documents", () => {
  it("prints the header and the page number", () => {
    const options = documentPdfOptions(
      pageSetupSchema.parse({ header: "Mar adentro · Ana Ruiz" }),
    );

    expect(options.displayHeaderFooter).toBe(true);
    expect(options.headerTemplate).toContain("Mar adentro · Ana Ruiz");
    expect(options.footerTemplate).toContain('class="pageNumber"');
  });

  it("escapes the header so it cannot add markup", () => {
    const { headerTemplate } = documentPdfOptions(
      pageSetupSchema.parse({ header: '<img src=x onerror="alert(1)">' }),
    );

    expect(headerTemplate).not.toContain("<img");
    expect(headerTemplate).toContain("&lt;img");
  });

  it("leaves the margins empty when there is nothing to print in them", () => {
    expect(
      documentPdfOptions(pageSetupSchema.parse({ pageNumbers: false })),
    ).toEqual({ displayHeaderFooter: false });

    const onlyNumbers = documentPdfOptions(pageSetupSchema.parse({}));
    expect(onlyNumbers.headerTemplate).toBe("<span></span>");
  });
});
