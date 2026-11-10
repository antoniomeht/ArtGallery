import { describe, expect, it } from "vitest";
import { packageDocumentSchema } from "./packageFormat";

const fileDocument = (originalName: string) => ({
  id: "3f2b8a4c-1d2e-4f5a-9b8c-7d6e5f4a3b2c",
  title: "Factura",
  notes: null,
  kind: "file",
  createdAt: "2026-11-10T10:00:00.000Z",
  updatedAt: "2026-11-10T10:00:00.000Z",
  file: {
    file: "documents/9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d.pdf",
    sha256: "0".repeat(64),
    bytes: 4,
    originalName,
    extension: "pdf",
  },
  content: null,
  pageSetup: null,
  links: {},
});

describe("documents in packages", () => {
  it("accepts a file whose name matches its format", () => {
    expect(
      packageDocumentSchema.safeParse(fileDocument("Factura.PDF")).success,
    ).toBe(true);
  });

  it("refuses a file whose name claims another format", () => {
    expect(
      packageDocumentSchema.safeParse(fileDocument("factura.exe")).success,
    ).toBe(false);
    expect(
      packageDocumentSchema.safeParse(fileDocument("factura")).success,
    ).toBe(false);
  });
});
