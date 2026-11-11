import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pageSetupSchema } from "../../shared/pageSetup";
import { createTestImage, listFiles, useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";
import { toDocx } from "./docxExport";

describe("Word files as text documents", () => {
  it("makes a text document from a Word file and keeps its images", async () => {
    const dataDir = await useTempDir();
    const { db, documents } = openInventory(dataDir);
    const image = await createTestImage(join(dataDir, "plano.png"));
    const file = join(dataDir, "Contrato Museo.docx");
    await writeFile(
      file,
      await toDocx(
        {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Cláusula 1" }],
            },
            {
              type: "image",
              attrs: {
                src: "document-asset:3f2b8a4c-1d2e-4f5a-9b8c-7d6e5f4a3b2c.png",
              },
            },
          ],
        },
        pageSetupSchema.parse({}),
        async () => image,
      ),
    );

    const { document, html } = await documents.importDocx(file);

    expect(document).toMatchObject({ kind: "text", title: "Contrato Museo" });
    expect(html).toContain("Cláusula 1");
    expect(html).toMatch(
      /src="artgallery-media:\/\/documents\/[0-9a-f-]{36}\.png"/,
    );
    expect(await listFiles(join(dataDir, "documents"))).toHaveLength(1);
    db.close();
  });

  it("exports a text document to Word", async () => {
    const { db, documents } = openInventory(await useTempDir());
    const { id } = documents.createText("Nota");
    documents.saveContent(id, {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hola" }] },
      ],
    });

    const buffer = await documents.exportDocx(id, async () => null);

    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    db.close();
  });
  it("shows an uploaded Word file as HTML without storing anything", async () => {
    const dataDir = await useTempDir();
    const { db, documents } = openInventory(dataDir);
    const image = await createTestImage(join(dataDir, "plano.png"));
    const file = join(dataDir, "Contrato.docx");
    await writeFile(
      file,
      await toDocx(
        {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Cláusula 1" }],
            },
            {
              type: "image",
              attrs: {
                src: "document-asset:3f2b8a4c-1d2e-4f5a-9b8c-7d6e5f4a3b2c.png",
              },
            },
          ],
        },
        pageSetupSchema.parse({}),
        async () => image,
      ),
    );
    const {
      added: [uploaded],
    } = await documents.uploadFiles([file]);
    const before = await listFiles(join(dataDir, "documents"));

    const html = await documents.previewDocx(uploaded!.id);

    expect(html).toContain("Cláusula 1");
    expect(html).toMatch(/src="data:image\/png;base64,[A-Za-z0-9+/=]+"/);
    expect(await listFiles(join(dataDir, "documents"))).toEqual(before);
    expect(documents.list({})).toHaveLength(1);
    db.close();
  });

  it("refuses to show a file that is not a Word document as one", async () => {
    const dataDir = await useTempDir();
    const { db, documents } = openInventory(dataDir);
    const file = join(dataDir, "nota.txt");
    await writeFile(file, "hola");
    const {
      added: [uploaded],
    } = await documents.uploadFiles([file]);

    await expect(documents.previewDocx(uploaded!.id)).rejects.toThrow(
      "not a Word document",
    );
    db.close();
  });
});
