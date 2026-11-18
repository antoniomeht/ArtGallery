import { describe, expect, it } from "vitest";
import { appMenuTemplate } from "./appMenu";

type Item = Electron.MenuItemConstructorOptions;
const roles = (items: readonly Item[]): string[] =>
  items.flatMap((item) => [
    ...(item.role ? [item.role] : []),
    ...(Array.isArray(item.submenu) ? roles(item.submenu) : []),
  ]);

describe("application menu", () => {
  it("has no menu bar on Windows and Linux", () => {
    expect(appMenuTemplate("win32", "ArtGallery")).toBeNull();
    expect(appMenuTemplate("linux", "ArtGallery")).toBeNull();
  });

  it("keeps only the app and editing commands on macOS, in Spanish", () => {
    const template = appMenuTemplate("darwin", "ArtGallery")!;
    expect(template.map(({ label }) => label)).toEqual([
      "ArtGallery",
      "Edición",
    ]);
    expect(roles(template)).toEqual(
      expect.arrayContaining(["quit", "undo", "copy", "paste"]),
    );
    expect(roles(template)).not.toContain("reload");
    expect(roles(template)).not.toContain("forceReload");
    expect(roles(template)).not.toContain("toggleDevTools");
  });
});
