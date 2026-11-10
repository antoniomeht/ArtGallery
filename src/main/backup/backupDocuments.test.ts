import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SettingsStore } from "../settings/settingsStore";
import { createTestImage, listFiles, useTempDir } from "../testing/fixtures";
import { openInventory } from "../testing/inventory";
import { BackupService } from "./backupService";

function openApp(root: string) {
  const dataDir = join(root, "data");
  const inventory = openInventory(dataDir);
  const backups = new BackupService({
    inventory: inventory.service,
    images: inventory.images,
    collections: inventory.collections,
    documents: inventory.documents,
    settings: new SettingsStore(join(dataDir, "settings.json")),
    defaultFolder: join(root, "Backups"),
    workDir: join(dataDir, "tmp"),
    appVersion: "0.1.0",
  });
  return { ...inventory, backups, dataDir };
}

const sha256 = async (path: string) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");

const COMMENTED = (commentId: string) => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Sala 1",
          marks: [{ type: "comment", attrs: { id: commentId } }],
        },
      ],
    },
  ],
});

describe("backups with collections and documents", () => {
  it("brings back collections and documents with their files, links and comments", async () => {
    const root = await useTempDir();
    const before = openApp(root);
    const photo = await createTestImage(join(before.dataDir, "marina.jpg"));
    const marina = await before.service.createArtwork({
      title: "Marina",
      imagePaths: [photo],
    });
    const exhibition = before.exhibitions.create({ name: "Mar adentro" });
    const port = before.collections.create("Serie del puerto");
    before.collections.setMembership(port.id, [marina.id], true);
    const pdfPath = join(before.dataDir, "certificado.pdf");
    await writeFile(pdfPath, "%PDF-1.4 certificado");
    const {
      added: [pdf],
    } = await before.documents.uploadFiles([pdfPath]);
    before.documents.link([pdf!.id], { type: "artwork", id: marina.id });
    before.documents.link([pdf!.id], { type: "collection", id: port.id });
    const text = before.documents.createText("Texto de sala");
    const comment = before.documents.addComment(text.id, "Revisar");
    const plan = await createTestImage(join(before.dataDir, "plano.png"));
    const asset = await before.documents.addImageAsset(text.id, plan);
    before.documents.saveContent(text.id, {
      ...COMMENTED(comment.id),
      content: [
        ...COMMENTED(comment.id).content,
        { type: "image", attrs: { src: asset } },
      ],
    });
    before.documents.savePageSetup(text.id, { header: "Galería Ruiz" });
    before.documents.link([text.id], { type: "exhibition", id: exhibition.id });
    const pdfSha = await sha256(before.documents.filePath(pdf!.id));
    await before.backups.createBackup();
    before.db.close();

    await rm(join(root, "data"), { recursive: true });
    const after = openApp(root);
    const [backup] = await after.backups.listBackups();
    expect(await after.backups.restore(backup!.path)).toMatchObject({
      ok: true,
    });

    expect(after.collections.list()).toEqual([
      { id: port.id, name: "Serie del puerto", artworkCount: 1 },
    ]);
    expect(
      after.documents.get(pdf!.id).links.map(({ label }) => label),
    ).toEqual(["Marina", "Serie del puerto"]);
    expect(await sha256(after.documents.filePath(pdf!.id))).toBe(pdfSha);
    const restoredText = after.documents.get(text.id);
    expect(restoredText.links.map(({ label }) => label)).toEqual([
      "Mar adentro",
    ]);
    expect(restoredText.pageSetup?.header).toBe("Galería Ruiz");
    expect(JSON.stringify(restoredText.content)).toContain(asset);
    expect(after.documents.listComments(text.id)).toEqual([
      expect.objectContaining({ id: comment.id, body: "Revisar" }),
    ]);
    expect(await listFiles(join(root, "data", "documents"))).toHaveLength(2);
    after.db.close();
  });

  it("restoring a backup without documents removes the current ones", async () => {
    const root = await useTempDir();
    const app = openApp(root);
    await app.service.createArtwork({ title: "Marina", imagePaths: [] });
    const backup = await app.backups.createBackup();
    app.collections.create("Obra en papel");
    const pdfPath = join(app.dataDir, "acta.pdf");
    await writeFile(pdfPath, "%PDF");
    await app.documents.uploadFiles([pdfPath]);

    await app.backups.restore(backup.path);

    expect(app.collections.list()).toEqual([]);
    expect(app.documents.list({})).toEqual([]);
    expect(await listFiles(join(app.dataDir, "documents"))).toEqual([]);
    app.db.close();
  });
});
