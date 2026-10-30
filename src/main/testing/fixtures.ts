import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach } from "vitest";

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
