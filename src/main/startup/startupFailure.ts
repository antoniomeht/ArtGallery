import { app, dialog, shell } from "electron";
import { NewerDatabaseError } from "../database/migrations";

/** What to tell the user when the app cannot start. */
export function startupFailureMessage(error: unknown): {
  message: string;
  detail: string;
} {
  if (error instanceof NewerDatabaseError) {
    return {
      message: "Este inventario es de una versión más reciente de ArtGallery.",
      detail:
        "Actualiza ArtGallery para abrirlo. Tus datos no se han modificado.",
    };
  }
  return {
    message: "ArtGallery no ha podido abrir tu inventario.",
    detail:
      "Comprueba que queda espacio libre en el disco y vuelve a abrir la aplicación. " +
      `Si sigue sin abrirse, este es el detalle del error:\n\n${String(error)}`,
  };
}

/**
 * Without this the app would stay running with no window and no word of
 * what went wrong.
 */
export async function reportStartupFailure(
  error: unknown,
  dataDir: string,
): Promise<void> {
  console.error("ArtGallery could not start", error);
  const { response } = await dialog.showMessageBox({
    type: "error",
    title: "ArtGallery",
    ...startupFailureMessage(error),
    buttons: ["Abrir carpeta de datos", "Salir"],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  });
  if (response === 0) await shell.openPath(dataDir);
  app.quit();
}
