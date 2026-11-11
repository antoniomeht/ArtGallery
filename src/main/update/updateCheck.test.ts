import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { useTempDir } from "../testing/fixtures";
import { checkForUpdate, downloadUpdate, isNewerVersion } from "./updateCheck";

const installer = Buffer.from("installer bytes");
const digest = `sha256:${createHash("sha256").update(installer).digest("hex")}`;

const release = {
  tag_name: "v0.2.0",
  html_url: "https://github.com/antoniomeht/ArtGallery/releases/tag/v0.2.0",
  draft: false,
  prerelease: false,
  assets: [
    {
      name: "ArtGallery-0.2.0-win-x64.exe",
      size: installer.length,
      digest,
      browser_download_url: "https://example.test/win.exe",
    },
    {
      name: "ArtGallery-0.2.0-mac-arm64.dmg",
      size: 10,
      digest: null,
      browser_download_url: "https://example.test/mac.dmg",
    },
  ],
};

/** Answers like GitHub: the release as JSON, assets as bytes. */
function fakeFetch(body: unknown, status = 200): typeof fetch {
  return (async (url: string | URL | Request) =>
    String(url).endsWith(".exe")
      ? new Response(installer)
      : new Response(JSON.stringify(body), { status })) as typeof fetch;
}

describe("version order", () => {
  it("compares each part as a number", () => {
    expect(isNewerVersion("0.10.0", "0.9.3")).toBe(true);
    expect(isNewerVersion("v0.2.0", "0.1.0")).toBe(true);
    expect(isNewerVersion("0.1.0", "0.1.0")).toBe(false);
    expect(isNewerVersion("0.0.9", "0.1.0")).toBe(false);
  });
});

describe("checking for an update", () => {
  const options = { currentVersion: "0.1.0", platform: "win32", arch: "x64" };

  it("offers the installer for this computer of a newer release", async () => {
    expect(
      await checkForUpdate({ ...options, fetch: fakeFetch(release) }),
    ).toEqual({
      version: "0.2.0",
      releaseUrl: release.html_url,
      asset: {
        name: "ArtGallery-0.2.0-win-x64.exe",
        url: "https://example.test/win.exe",
        size: installer.length,
        sha256: digest.slice("sha256:".length),
      },
    });
  });

  it("offers nothing when up to date, without an installer or unreachable", async () => {
    const current = { ...release, tag_name: "v0.1.0" };
    expect(
      await checkForUpdate({ ...options, fetch: fakeFetch(current) }),
    ).toBeNull();
    expect(
      await checkForUpdate({
        ...options,
        platform: "linux",
        fetch: fakeFetch(release),
      }),
    ).toBeNull();
    expect(
      await checkForUpdate({ ...options, fetch: fakeFetch({}, 404) }),
    ).toBeNull();
  });
});

describe("downloading an update", () => {
  it("keeps the installer only when its fingerprint matches", async () => {
    const dir = await useTempDir();
    const update = await checkForUpdate({
      currentVersion: "0.1.0",
      platform: "win32",
      arch: "x64",
      fetch: fakeFetch(release),
    });

    const path = await downloadUpdate(update!, dir, fakeFetch(release));
    expect(path).toBe(join(dir, "ArtGallery-0.2.0-win-x64.exe"));
    expect(await readFile(path)).toEqual(installer);

    const tampered = {
      ...update!,
      asset: { ...update!.asset, sha256: "0".repeat(64) },
    };
    await expect(
      downloadUpdate(tampered, dir, fakeFetch(release)),
    ).rejects.toThrow();
  });
});
