import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach } from "vitest";
import { ZipFile } from "yazl";

/** Creates a temporary folder that is removed after the current test. */
export async function useTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "artgallery-test-"));
  afterEach(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

export async function createTestImage(
  path: string,
  { width = 1200, height = 900 } = {},
): Promise<string> {
  await sharp({
    create: { width, height, channels: 3, background: "#1f3fbf" },
  }).toFile(path);
  return path;
}

/** Lists every file under `dir`, relative to it, or [] if it does not exist. */
export async function listFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, {
      recursive: true,
      withFileTypes: true,
    });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

/** Writes a ZIP file with the given text entries, e.g. a hand-made package. */
export async function zipWith(path: string, entries: Record<string, string>) {
  const zip = new ZipFile();
  for (const [name, content] of Object.entries(entries)) {
    zip.addBuffer(Buffer.from(content), name);
  }
  zip.end();
  const chunks: Buffer[] = [];
  for await (const chunk of zip.outputStream) chunks.push(chunk as Buffer);
  await writeFile(path, Buffer.concat(chunks));
}
