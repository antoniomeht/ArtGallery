import { spawn } from "node:child_process";
import { app, ipcMain, net, shell } from "electron";
import { IpcChannel } from "../../shared/api";
import type { UpdateInfo } from "../../shared/update";
import type { SettingsStore } from "../settings/settingsStore";
import { checkForUpdate, downloadUpdate } from "../update/updateCheck";

/**
 * Experimental: looks for a newer published version on GitHub and installs
 * it on request. Only what the main process found itself is installed; the
 * window never chooses what to download.
 */
export function registerUpdateHandlers(
  settings: SettingsStore,
  downloadDir: string,
): void {
  let found: UpdateInfo | null = null;
  const fetch = net.fetch.bind(net) as typeof globalThis.fetch;

  ipcMain.handle(IpcChannel.checkForUpdate, async () => {
    const { checkForUpdates } = await settings.read();
    found = checkForUpdates
      ? await checkForUpdate({
          currentVersion: app.getVersion(),
          platform: process.platform,
          arch: process.arch,
          fetch,
        })
      : null;
    return found;
  });

  ipcMain.handle(IpcChannel.installUpdate, async () => {
    if (!found) throw new Error("No update to install");
    const path = await downloadUpdate(found, downloadDir, fetch);
    if (process.platform === "win32") {
      // The installer replaces the app, so the app closes for it.
      spawn(path, [], { detached: true, stdio: "ignore" }).unref();
      app.quit();
    } else {
      // A disk image: the app is dragged to Applications by hand.
      await shell.openPath(path);
    }
  });

  ipcMain.handle(IpcChannel.openReleaseNotes, () => {
    if (found) void shell.openExternal(found.releaseUrl);
  });
}
