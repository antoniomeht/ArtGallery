import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listFiles, useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";

async function withFiles(names: Record<string, string>) {
  const dataDir = await useTempDir();
  const inbox = join(dataDir, "inbox");
  await mkdir(inbox);
  const paths: Record<string, string> = {};
  for (const [name, content] of Object.entries(names)) {
    paths[name] = join(inbox, name);
    await writeFile(paths[name], content);
  }
  return { dataDir, paths, ...openInventory(dataDir) };
}

describe("DocumentService", () => {
  it("uploads allowed files and reports the rest", async () => {
    const { db, documents, paths, dataDir } = await withFiles({
      "Contrato Museo.PDF": "%PDF-1.4",
      "setup.exe": "MZ",
      "vacío.txt": "",
    });

    const result = await documents.uploadFiles([
      paths["Contrato Museo.PDF"]!,
      paths["setup.exe"]!,
      paths["vacío.txt"]!,
      join(dataDir, "inbox"),
    ]);

    expect(
      result.added.map(({ title, extension }) => [title, extension]),
    ).toEqual([
      ["Contrato Museo", "pdf"],
      ["vacío", "txt"],
    ]);
    expect(result.failed).toEqual([
      { name: "setup.exe", reason: "unsupported" },
      { name: "inbox", reason: "unreadable" },
    ]);
    expect(await listFiles(join(dataDir, "documents"))).toHaveLength(2);
    db.close();
  });

  it("rejects files over the size limit without leaving copies", async () => {
    const { db, documents, paths, dataDir } = await withFiles({
      "grande.pdf": "x".repeat(2048),
    });

    const result = await documents.uploadFiles([paths["grande.pdf"]!], {
      maxBytes: 1024,
    });

    expect(result).toEqual({
      added: [],
      failed: [{ name: "grande.pdf", reason: "too-large" }],
    });
    expect(await listFiles(join(dataDir, "documents"))).toEqual([]);
    db.close();
  });

  it("searches titles and notes and sorts by title", async () => {
    const { db, documents, paths } = await withFiles({
      "b.pdf": "1",
      "a.pdf": "2",
    });
    const {
      added: [b],
    } = await documents.uploadFiles([paths["b.pdf"]!, paths["a.pdf"]!]);
    documents.update(b!.id, {
      title: "Seguro",
      notes: "Contrato con la aseguradora",
    });

    expect(
      documents.list({ text: "contrato" }).map(({ title }) => title),
    ).toEqual(["Seguro"]);
    expect(documents.list({ sort: "title" }).map(({ title }) => title)).toEqual(
      ["a", "Seguro"],
    );
    db.close();
  });

  it("replaces the file and keeps the document", async () => {
    const { db, documents, paths, dataDir } = await withFiles({
      "contrato.pdf": "v1",
      "contrato firmado.docx": "version 2",
    });
    const {
      added: [doc],
    } = await documents.uploadFiles([paths["contrato.pdf"]!]);

    const replaced = await documents.replaceFile(
      doc!.id,
      paths["contrato firmado.docx"]!,
    );

    expect(replaced).toMatchObject({
      id: doc!.id,
      title: "contrato",
      originalName: "contrato firmado.docx",
      extension: "docx",
      bytes: 9,
    });
    expect(await listFiles(join(dataDir, "documents"))).toHaveLength(1);
    db.close();
  });

  it("hides a deleted document, restores it and purges it later", async () => {
    const { db, documents, paths, dataDir } = await withFiles({
      "acta.pdf": "1",
    });
    const {
      added: [doc],
    } = await documents.uploadFiles([paths["acta.pdf"]!]);

    documents.delete(doc!.id);
    expect(documents.list({})).toEqual([]);
    expect(() => documents.get(doc!.id)).toThrow(/not found/);

    documents.restore(doc!.id);
    expect(documents.list({})).toHaveLength(1);

    documents.delete(doc!.id);
    await documents.purgeDeleted();
    documents.restore(doc!.id);
    expect(documents.list({})).toEqual([]);
    expect(await listFiles(join(dataDir, "documents"))).toEqual([]);
    db.close();
  });
});
