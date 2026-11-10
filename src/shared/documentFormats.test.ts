import { describe, expect, it } from "vitest";
import {
  documentBadge,
  documentExtension,
  isSlowPdf,
  isViewableImage,
} from "./documentFormats";

describe("document formats", () => {
  it("accepts allowed extensions in any case", () => {
    expect(documentExtension("C:\\Docs\\CONTRATO.PDF")).toBe("pdf");
    expect(documentExtension("/home/ana/plano.final.docx")).toBe("docx");
    expect(documentExtension("factura.jpeg")).toBe("jpeg");
  });

  it("rejects other extensions and files without one", () => {
    expect(documentExtension("setup.exe")).toBeNull();
    expect(documentExtension("script.ps1")).toBeNull();
    expect(documentExtension("sin-extension")).toBeNull();
    expect(documentExtension("C:\\carpeta.pdf\\archivo")).toBeNull();
  });

  it("names formats with a short badge", () => {
    expect(documentBadge("pdf")).toBe("PDF");
    expect(documentBadge("docx")).toBe("DOCX");
    expect(documentBadge(null)).toBe("TEXTO");
  });

  it("tells which images can be shown inside the app", () => {
    expect(isViewableImage("png")).toBe(true);
    expect(isViewableImage("tiff")).toBe(false);
    expect(isViewableImage("pdf")).toBe(false);
  });
});

describe("isSlowPdf", () => {
  const MB = 1024 * 1024;

  it("flags PDFs of 100 MB or more, which take long to show", () => {
    expect(isSlowPdf("pdf", 100 * MB)).toBe(true);
    expect(isSlowPdf("pdf", 457 * MB)).toBe(true);
  });

  it("leaves smaller PDFs and other formats alone", () => {
    expect(isSlowPdf("pdf", 43 * MB)).toBe(false);
    expect(isSlowPdf("jpg", 457 * MB)).toBe(false);
    expect(isSlowPdf("pdf", null)).toBe(false);
  });
});
