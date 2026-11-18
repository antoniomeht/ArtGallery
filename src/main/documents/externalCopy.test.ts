import { copyFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { useTempDir } from "../testing/fixtures";
import { externalCopyState, writeExternalCopy } from "./externalCopy";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, copyFile: vi.fn(actual.copyFile) };
});

const failure = (code: string) =>
  Object.assign(new Error(`${code}: copy failed`), { code });

async function withStoredFile(content = "versión de ArtGallery") {
  const dir = await useTempDir();
  const stored = join(dir, "stored.docx");
  await writeFile(stored, content);
  return { stored, copy: join(dir, "ArtGallery", "doc-1", "Contrato.docx") };
}

describe("externalCopyState", () => {
  it("is fresh when no copy has been opened yet", async () => {
    const { stored, copy } = await withStoredFile();

    expect(await externalCopyState(stored, copy)).toBe("fresh");
  });

  it("is the same when the copy matches the stored file", async () => {
    const { stored, copy } = await withStoredFile();
    await writeExternalCopy(stored, copy);

    expect(await externalCopyState(stored, copy)).toBe("same");
  });

  it("is changed when the copy was edited outside, even at the same size", async () => {
    const { stored, copy } = await withStoredFile("abc");
    await writeExternalCopy(stored, copy);

    await writeFile(copy, "abd");
    expect(await externalCopyState(stored, copy)).toBe("changed");
    await writeFile(copy, "abc, corregido en Word");
    expect(await externalCopyState(stored, copy)).toBe("changed");
  });
});

describe("writeExternalCopy", () => {
  it("creates the folder and overwrites an earlier copy", async () => {
    const { stored, copy } = await withStoredFile();
    await writeExternalCopy(stored, copy);
    await writeFile(copy, "cambiada");

    await writeExternalCopy(stored, copy);

    expect(await readFile(copy, "utf8")).toBe("versión de ArtGallery");
  });

  it.each(["EBUSY", "EPERM"])(
    "keeps a copy that another application has locked (%s)",
    async (code) => {
      const { stored, copy } = await withStoredFile();
      await writeExternalCopy(stored, copy);
      await writeFile(copy, "abierta en Word");
      vi.mocked(copyFile).mockRejectedValueOnce(failure(code));

      await writeExternalCopy(stored, copy);

      expect(await readFile(copy, "utf8")).toBe("abierta en Word");
    },
  );

  it("fails when there is no copy to fall back on", async () => {
    const { stored, copy } = await withStoredFile();
    vi.mocked(copyFile).mockRejectedValueOnce(failure("EPERM"));

    await expect(writeExternalCopy(stored, copy)).rejects.toThrow("EPERM");
  });

  it("fails on other errors even if a copy exists", async () => {
    const { stored, copy } = await withStoredFile();
    await writeExternalCopy(stored, copy);
    vi.mocked(copyFile).mockRejectedValueOnce(failure("ENOSPC"));

    await expect(writeExternalCopy(stored, copy)).rejects.toThrow("ENOSPC");
  });
});
