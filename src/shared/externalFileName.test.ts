import { describe, expect, it } from "vitest";
import { externalFileName } from "./documentFormats";

describe("names of document copies opened outside the app", () => {
  it("keeps the original name when its extension is the stored one", () => {
    expect(externalFileName("Contrato Museo.docx", "docx")).toBe(
      "Contrato Museo.docx",
    );
    expect(externalFileName("ACTA.PDF", "pdf")).toBe("ACTA.pdf");
  });

  it("always ends with the stored format, so nothing else can run", () => {
    expect(externalFileName("factura.exe", "pdf")).toBe("factura.pdf");
    expect(externalFileName("informe.pdf.lnk", "pdf")).toBe("informe.pdf.pdf");
    expect(externalFileName("..\\..\\x.bat", "txt")).toBe("x.txt");
    expect(externalFileName("", "png")).toBe("documento.png");
  });

  it("removes characters Windows and macOS reject", () => {
    expect(externalFileName('Plano: "sala"?.pdf', "pdf")).toBe(
      "Plano sala.pdf",
    );
  });
});
