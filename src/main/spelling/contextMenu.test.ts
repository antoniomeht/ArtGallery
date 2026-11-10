import { describe, expect, it } from "vitest";
import { contextMenuItems } from "./contextMenu";

const labels = (items: ReturnType<typeof contextMenuItems>) =>
  items.map((item) => item.label ?? item.type);

describe("text context menu", () => {
  it("offers corrections for a misspelled word first", () => {
    const items = contextMenuItems({
      isEditable: true,
      misspelledWord: "puetro",
      dictionarySuggestions: ["puerto", "puerta"],
      selectionText: "puetro",
    });

    expect(labels(items)).toEqual([
      "puerto",
      "puerta",
      "Añadir al diccionario",
      "separator",
      "Cortar",
      "Copiar",
      "Pegar",
      "Seleccionar todo",
    ]);
  });

  it("says when there are no corrections", () => {
    const items = contextMenuItems({
      isEditable: true,
      misspelledWord: "xqzt",
      dictionarySuggestions: [],
      selectionText: "",
    });

    expect(items[0]).toMatchObject({
      label: "Sin sugerencias",
      enabled: false,
    });
  });

  it("only offers copying outside editable text", () => {
    expect(
      labels(
        contextMenuItems({
          isEditable: false,
          misspelledWord: "",
          dictionarySuggestions: [],
          selectionText: "Marina",
        }),
      ),
    ).toEqual(["Copiar"]);
    expect(
      contextMenuItems({
        isEditable: false,
        misspelledWord: "",
        dictionarySuggestions: [],
        selectionText: "",
      }),
    ).toEqual([]);
  });
});
