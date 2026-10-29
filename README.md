# ArtGallery

Inventario personal de cuadros, pinturas y dibujos para Windows y macOS. Funciona sin conexión, sin cuentas y sin servicios externos: los datos y las imágenes se guardan en el propio equipo.

> **Estado:** en desarrollo. Ya se pueden añadir obras con título, artista e imágenes y verlas en la galería. La ficha completa, la edición, la búsqueda, las copias de seguridad, la importación/exportación y las exposiciones llegarán en próximas entregas.

## Funciones disponibles

- Galería en cuadrícula con las imágenes como protagonistas.
- Alta de obras pidiendo solo lo imprescindible: título (obligatorio), artista e imágenes. La primera imagen es la principal.
- Las fotografías se copian al almacenamiento de ArtGallery: la obra sigue funcionando aunque se mueva o borre el archivo original.

## Tecnologías

| Pieza      | Elección                         | Motivo                                                                                              |
| ---------- | -------------------------------- | --------------------------------------------------------------------------------------------------- |
| Escritorio | Electron 44                      | Un único código TypeScript para Windows y macOS, generación de PDF integrada y empaquetado maduro.  |
| Interfaz   | React 19 + CSS propio            | Componentes sencillos y diseño a medida sin dependencias de estilos.                                |
| Datos      | SQLite (`node:sqlite`) + sharp   | SQLite viene incluido en Electron, sin módulos nativos que recompilar. sharp genera las miniaturas. |
| Build      | electron-vite + electron-builder | Desarrollo con recarga rápida e instaladores NSIS (Windows) y DMG (macOS).                          |

Se descartó Tauri por ahora: genera binarios más pequeños, pero exige mantener una segunda base de código en Rust y su generación de PDF depende del WebView de cada sistema.

## Dónde se guardan los datos

La base de datos y las imágenes viven en la carpeta de datos del usuario, fuera de la carpeta de instalación:

| Sistema | Carpeta                                    |
| ------- | ------------------------------------------ |
| Windows | `%APPDATA%\ArtGallery`                     |
| macOS   | `~/Library/Application Support/ArtGallery` |

Dentro hay `artgallery.sqlite` (inventario), `images/originals` (copias exactas de las fotografías) e `images/thumbnails` (miniaturas WebP). El instalador de Windows está configurado para conservar esta carpeta al desinstalar.

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
npm test
```

Las pruebas usan bases de datos e imágenes temporales y cubren lo que protege el inventario: migraciones, persistencia al reabrir, copia de imágenes y que una operación fallida no deje datos a medias.

Generar el instalador del sistema actual (se guarda en `release/<versión>/`):

```bash
npm run package
```

Los instaladores aún no están firmados: Windows SmartScreen y macOS Gatekeeper mostrarán un aviso al abrirlos. En macOS solo se genera, por ahora, la versión para Apple Silicon (arm64).

## Licencia

[MIT](LICENSE)
