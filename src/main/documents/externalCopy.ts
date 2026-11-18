import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";

/** How the copy opened outside the app compares with the stored file. */
export type ExternalCopyState = "fresh" | "same" | "changed";

export async function externalCopyState(
  storedPath: string,
  copyPath: string,
): Promise<ExternalCopyState> {
  const copy = await stat(copyPath).catch(() => null);
  if (!copy) return "fresh";
  if (copy.size !== (await stat(storedPath)).size) return "changed";
  const [stored, copied] = await Promise.all([
    fileHash(storedPath),
    fileHash(copyPath),
  ]);
  return stored === copied ? "same" : "changed";
}

/**
 * Puts the stored file in place of the copy. A copy locked by the application
 * that has it open is kept as it is, so it can still be brought to the front.
 */
export async function writeExternalCopy(
  storedPath: string,
  copyPath: string,
): Promise<void> {
  await mkdir(dirname(copyPath), { recursive: true });
  try {
    await copyFile(storedPath, copyPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    const isLocked = code === "EBUSY" || code === "EPERM";
    if (!isLocked || !(await stat(copyPath).catch(() => null))) throw error;
  }
}

// Streamed: documents can be hundreds of megabytes.
async function fileHash(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
