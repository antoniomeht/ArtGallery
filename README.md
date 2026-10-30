# ArtGallery

Inventario personal de cuadros, pinturas y dibujos para Windows y macOS. Funciona sin conexión, sin cuentas y sin servicios externos: los datos y las imágenes se guardan en el propio equipo.

> **Estado:** en desarrollo. Por ahora solo existe la base del proyecto (ventana principal, identidad visual, empaquetado y CI). El inventario se incorpora en las próximas entregas.

## Tecnologías

| Pieza      | Elección                         | Motivo                                                                                             |
| ---------- | -------------------------------- | -------------------------------------------------------------------------------------------------- |
| Escritorio | Electron 44                      | Un único código TypeScript para Windows y macOS, generación de PDF integrada y empaquetado maduro. |
| Interfaz   | React 19 + CSS propio            | Componentes sencillos y diseño a medida sin dependencias de estilos.                               |
| Build      | electron-vite + electron-builder | Desarrollo con recarga rápida e instaladores NSIS (Windows) y DMG (macOS).                         |

Se descartó Tauri por ahora: genera binarios más pequeños, pero exige mantener una segunda base de código en Rust y su generación de PDF depende del WebView de cada sistema.

## Desarrollo

Requisitos: Node.js 24 y npm.

```bash
npm ci            # instala dependencias exactas del lockfile
npm run dev       # abre la aplicación en modo desarrollo
```

Comprobaciones (las mismas que ejecuta el CI):

```bash
npm run format:check
npm run lint
npm run typecheck
```

Generar el instalador del sistema actual (se guarda en `release/<versión>/`):

```bash
npm run package
```

Los instaladores aún no están firmados: Windows SmartScreen y macOS Gatekeeper mostrarán un aviso al abrirlos.

## Licencia

[MIT](LICENSE)
