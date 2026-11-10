import type { MenuItemConstructorOptions } from "electron";

export interface TextContext {
  isEditable: boolean;
  misspelledWord: string;
  dictionarySuggestions: string[];
  selectionText: string;
}

export interface SpellingActions {
  replaceMisspelling: (word: string) => void;
  addToDictionary: (word: string) => void;
}

/**
 * The right-click menu over text: corrections first when the system's
 * spell checker marks the word, then the usual editing commands.
 */
export function contextMenuItems(
  context: TextContext,
  actions?: SpellingActions,
): MenuItemConstructorOptions[] {
  if (!context.isEditable) {
    return context.selectionText ? [{ label: "Copiar", role: "copy" }] : [];
  }
  const items: MenuItemConstructorOptions[] = [];
  if (context.misspelledWord) {
    if (context.dictionarySuggestions.length === 0) {
      items.push({ label: "Sin sugerencias", enabled: false });
    }
    for (const suggestion of context.dictionarySuggestions) {
      items.push({
        label: suggestion,
        click: () => actions?.replaceMisspelling(suggestion),
      });
    }
    items.push(
      {
        label: "Añadir al diccionario",
        click: () => actions?.addToDictionary(context.misspelledWord),
      },
      { type: "separator" },
    );
  }
  items.push(
    { label: "Cortar", role: "cut" },
    { label: "Copiar", role: "copy" },
    { label: "Pegar", role: "paste" },
    { label: "Seleccionar todo", role: "selectAll" },
  );
  return items;
}
