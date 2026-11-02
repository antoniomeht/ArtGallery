import { ipcMain, shell } from "electron";
import { mkdir } from "node:fs/promises";
import { z } from "zod";
import { IpcChannel } from "../../shared/api";
import { settingsSchema } from "../../shared/settings";
import type { BackupService } from "../backup/backupService";
import { PACKAGE_EXTENSION } from "../package/packageFormat";
import type { SettingsStore } from "../settings/settingsStore";
import { showOpenDialog } from "./dialogs";

interface BackupHandlerOptions {
  backups: BackupService;
  settings: SettingsStore;
  dataFolder: string;
}

export function registerBackupHandlers({
  backups,
  settings,
  dataFolder,
}: BackupHandlerOptions): void {
  ipcMain.handle(IpcChannel.getBackupOverview, async () => ({
    folder: await backups.folder(),
    dataFolder,
    settings: await settings.read(),
    backups: await backups.listBackups(),
  }));

  ipcMain.handle(IpcChannel.updateSettings, (_event, changes: unknown) =>
    settings.update(settingsSchema.partial().parse(changes)),
  );

  ipcMain.handle(IpcChannel.createBackup, () => backups.createBackup());

  ipcMain.handle(IpcChannel.restoreBackup, (_event, path: unknown) =>
    backups.restore(z.string().min(1).parse(path)),
  );

  ipcMain.handle(IpcChannel.chooseBackupFolder, async (event) => {
    const result = await showOpenDialog(event.sender, {
      title: "Elegir carpeta de copias de seguridad",
      properties: ["openDirectory", "createDirectory"],
    });
    const folder = result[0];
    if (folder) await settings.update({ backupFolder: folder });
    return folder ?? null;
  });

  ipcMain.handle(IpcChannel.chooseBackupFile, async (event) => {
    const [file] = await showOpenDialog(event.sender, {
      title: "Elegir copia de seguridad",
      properties: ["openFile"],
      filters: [
        {
          name: "Copias de ArtGallery",
          extensions: [PACKAGE_EXTENSION.slice(1)],
        },
      ],
    });
    return file ?? null;
  });

  ipcMain.handle(IpcChannel.openFolder, async (_event, which: unknown) => {
    const folder =
      z.enum(["backups", "data"]).parse(which) === "data"
        ? dataFolder
        : await backups.folder();
    await mkdir(folder, { recursive: true });
    await shell.openPath(folder);
  });
}
