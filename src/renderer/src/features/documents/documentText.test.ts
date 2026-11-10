import { describe, expect, it } from "vitest";
import type { DocumentDetail, UploadResult } from "../../../../shared/document";
import { formatBytes, uploadSummary } from "./documentText";

const added = (originalName: string) =>
  ({ originalName, title: originalName }) as DocumentDetail;

const result = (
  names: string[],
  failed: UploadResult["failed"] = [],
): UploadResult => ({ added: names.map(added), failed });

describe("document texts", () => {
  it("formats sizes as a Spanish reader expects", () => {
    expect(formatBytes(88)).toBe("88 bytes");
    expect(formatBytes(412 * 1024)).toBe("412 KB");
    expect(formatBytes(1.2 * 1024 * 1024)).toBe("1,2 MB");
  });

  it("names a single added document", () => {
    expect(uploadSummary(result(["contrato.pdf"]))).toEqual({
      tone: "success",
      message: "Documento añadido: contrato.pdf",
    });
  });

  it("counts several added documents", () => {
    expect(uploadSummary(result(["a.pdf", "b.pdf", "c.pdf"]))).toEqual({
      tone: "success",
      message: "3 documentos añadidos",
    });
  });

  it("explains why a single file was refused", () => {
    expect(
      uploadSummary(result([], [{ name: "setup.exe", reason: "unsupported" }])),
    ).toEqual({
      tone: "error",
      message: "No se pudo añadir setup.exe: formato no admitido",
    });
  });

  it("names every refused file next to the ones added", () => {
    expect(
      uploadSummary(
        result(
          ["a.pdf", "b.pdf"],
          [
            { name: "planos.dwg", reason: "unsupported" },
            { name: "video.mov", reason: "too-large" },
          ],
        ),
      ).message,
    ).toBe(
      "2 documentos añadidos. No se pudo añadir planos.dwg (formato no admitido) ni video.mov (supera 500 MB)",
    );
    expect(
      uploadSummary(
        result(
          [],
          [
            { name: "Fotos", reason: "unreadable" },
            { name: "x.exe", reason: "unsupported" },
          ],
        ),
      ).message,
    ).toBe(
      "No se pudo añadir Fotos (no se puede leer) ni x.exe (formato no admitido)",
    );
  });
});
