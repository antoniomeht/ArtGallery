import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { z } from "zod";
import type { UpdateInfo } from "../../shared/update";

type Fetch = typeof globalThis.fetch;

/** Only published releases count; drafts and pre-releases are skipped. */
const LATEST_RELEASE_URL =
  "https://api.github.com/repos/antoniomeht/ArtGallery/releases/latest";

const releaseSchema = z.object({
  tag_name: z.string(),
  html_url: z.string().url(),
  assets: z.array(
    z.object({
      name: z.string(),
      size: z.number().int().positive(),
      digest: z.string().nullish(),
      browser_download_url: z.string().url(),
    }),
  ),
});

/** End of the installer's file name for each system, see electron-builder. */
const INSTALLER_SUFFIX: Record<string, string> = {
  "win32-x64": "-win-x64.exe",
  "darwin-arm64": "-mac-arm64.dmg",
};

const versionParts = (version: string) =>
  version.replace(/^v/, "").split(".").map(Number);

/** True when `candidate` comes after `current`, part by part. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = versionParts(candidate);
  const b = versionParts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}

interface CheckOptions {
  currentVersion: string;
  platform: string;
  arch: string;
  fetch: Fetch;
}

/**
 * The newest published release when it is newer than this app and has a
 * verifiable installer for this computer; null otherwise, including when
 * GitHub cannot be reached.
 */
export async function checkForUpdate({
  currentVersion,
  platform,
  arch,
  fetch,
}: CheckOptions): Promise<UpdateInfo | null> {
  const suffix = INSTALLER_SUFFIX[`${platform}-${arch}`];
  if (!suffix) return null;
  try {
    const response = await fetch(LATEST_RELEASE_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return null;
    const release = releaseSchema.parse(await response.json());
    if (!isNewerVersion(release.tag_name, currentVersion)) return null;
    const asset = release.assets.find(({ name }) => name.endsWith(suffix));
    const sha256 = asset?.digest?.match(/^sha256:([0-9a-f]{64})$/)?.[1];
    if (!asset || !sha256) return null;
    return {
      version: release.tag_name.replace(/^v/, ""),
      releaseUrl: release.html_url,
      asset: {
        name: asset.name,
        url: asset.browser_download_url,
        size: asset.size,
        sha256,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Downloads the installer into `dir` and returns its path. A file whose
 * SHA-256 differs from the one GitHub published is deleted, never opened.
 */
export async function downloadUpdate(
  update: UpdateInfo,
  dir: string,
  fetch: Fetch,
): Promise<string> {
  const { name, url, sha256 } = update.asset;
  if (!/^[\w.-]+$/.test(name)) throw new Error(`Unexpected file name ${name}`);
  await mkdir(dir, { recursive: true });
  const path = join(dir, name);
  const partial = `${path}.partial`;
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: ${response.status}`);
  }
  const hash = createHash("sha256");
  try {
    await pipeline(
      Readable.fromWeb(response.body as WebReadableStream),
      new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          hash.update(chunk);
          callback(null, chunk);
        },
      }),
      createWriteStream(partial),
    );
    if (hash.digest("hex") !== sha256) {
      throw new Error("The installer does not match the published one");
    }
    await rename(partial, path);
    return path;
  } finally {
    await rm(partial, { force: true });
  }
}
