import { describe, expect, it } from "vitest";
import { NewerDatabaseError } from "../database/migrations";
import { startupFailureMessage } from "./startupFailure";

describe("startup failure message", () => {
  it("asks to update the app when the inventory is newer", () => {
    expect(startupFailureMessage(new NewerDatabaseError(16, 15))).toEqual({
      message: "Este inventario es de una versión más reciente de ArtGallery.",
      detail:
        "Actualiza ArtGallery para abrirlo. Tus datos no se han modificado.",
    });
  });

  it("explains any other failure and keeps its technical detail", () => {
    const { message, detail } = startupFailureMessage(
      new Error("database is locked"),
    );
    expect(message).toBe("ArtGallery no ha podido abrir tu inventario.");
    expect(detail).toContain("database is locked");
  });
});
