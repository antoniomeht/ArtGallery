type Template = Electron.MenuItemConstructorOptions[];

/**
 * Electron's default menu is in English and lets Ctrl+R reload the window,
 * losing unsaved edits. Windows and Linux need no menu bar: the app has its
 * own navigation and text fields handle copy and paste themselves. macOS
 * always shows a menu, and Cmd+C/V only work through the Edit roles.
 */
export function appMenuTemplate(
  platform: NodeJS.Platform,
  appName: string,
): Template | null {
  if (platform !== "darwin") return null;
  return [
    {
      label: appName,
      submenu: [
        { role: "about", label: `Acerca de ${appName}` },
        { type: "separator" },
        { role: "hide", label: `Ocultar ${appName}` },
        { role: "hideOthers", label: "Ocultar otros" },
        { role: "unhide", label: "Mostrar todo" },
        { type: "separator" },
        { role: "quit", label: `Salir de ${appName}` },
      ],
    },
    {
      label: "Edición",
      submenu: [
        { role: "undo", label: "Deshacer" },
        { role: "redo", label: "Rehacer" },
        { type: "separator" },
        { role: "cut", label: "Cortar" },
        { role: "copy", label: "Copiar" },
        { role: "paste", label: "Pegar" },
        { role: "selectAll", label: "Seleccionar todo" },
      ],
    },
  ];
}
