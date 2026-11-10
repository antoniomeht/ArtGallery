import { describe, expect, it } from "vitest";
import {
  documentBadge,
  documentExtension,
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
