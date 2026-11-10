import { describe, expect, it } from "vitest";
import { useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";

describe("page setup of text documents", () => {
  it("starts with the defaults and keeps what is saved", async () => {
    const { db, documents } = openInventory(await useTempDir());
    const { id, pageSetup } = documents.createText("Nota de prensa");

    documents.savePageSetup(id, { size: "Letter", header: "Galería Ruiz" });

    expect(pageSetup).toMatchObject({ size: "A4", pageNumbers: true });
    expect(documents.get(id).pageSetup).toEqual({
      size: "Letter",
      orientation: "portrait",
      margins: "normal",
      header: "Galería Ruiz",
      pageNumbers: true,
    });
    db.close();
  });

  it("refuses an invalid page setup without changing it", async () => {
    const { db, documents } = openInventory(await useTempDir());
    const { id } = documents.createText("Nota");

    expect(() => documents.savePageSetup(id, { size: "A3" })).toThrow();
    expect(documents.get(id).pageSetup?.size).toBe("A4");
    db.close();
  });
});
