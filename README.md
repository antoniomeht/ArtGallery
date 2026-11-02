# ArtGallery

Inventario personal de cuadros, pinturas y dibujos para Windows y macOS. Funciona sin conexión, sin cuentas y sin servicios externos: los datos y las imágenes se guardan en el propio equipo.

> **Estado:** en desarrollo. Ya se pueden añadir obras, verlas en la galería, consultar y editar su ficha completa, gestionar sus imágenes y recuperar obras desde la papelera, además de buscar y filtrar el inventario. Las copias de seguridad, la importación/exportación y las exposiciones llegarán en próximas entregas.

## Funciones disponibles

- Galería en cuadrícula con las imágenes como protagonistas, ordenable por fecha de incorporación, título (sin distinguir tildes ni mayúsculas) o año.
- Búsqueda de texto en todos los campos (título, artista, técnica, soporte, descripción, notas, ubicación y etiquetas), sin distinguir tildes ni mayúsculas, combinable con filtros de estado, categoría, artista, técnica, etiqueta, ubicación y rango de años.
- Selección múltiple con acciones en bloque: cambiar el estado o mover a la papelera, con opción de deshacer.
- Alta de obras pidiendo solo lo imprescindible: título (obligatorio), artista e imágenes. La primera imagen es la principal.
- Las fotografías se copian al almacenamiento de ArtGallery: la obra sigue funcionando aunque se mueva o borre el archivo original.
- Ficha de cada obra con estilo de cartela de museo y edición de todos los campos: artista, categoría, técnica y soporte, año (exacto o aproximado), alto, ancho y profundidad con unidades, descripción, notas, etiquetas, ubicación, estado (disponible, expuesta, prestada, vendida u otro) y precio con moneda.
- Gestión de imágenes desde la ficha: añadir más, elegir la principal (la portada en la galería) y quitar imágenes con confirmación.
- Papelera recuperable: las obras borradas conservan datos e imágenes hasta eliminarlas definitivamente; al moverlas se puede deshacer al momento.

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

Cuando una actualización de la aplicación cambia la estructura de la base de datos, antes de migrarla se guarda una copia completa junto a ella (`artgallery.before-update-v<N>.sqlite`).

## Formato portátil `.artgallery`

Las copias de seguridad y las exportaciones usan un mismo formato documentado y versionado: un archivo ZIP con extensión `.artgallery`.

| Entrada             | Contenido                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.json`     | `format: "artgallery"`, `formatVersion` (actualmente `1`), `kind` (`backup` para el inventario completo o `artworks` para una selección), fecha, versión de la app y recuentos. |
| `data.json`         | Obras con todos sus campos, etiquetas, fechas y la lista ordenada de imágenes (la primera es la principal), cada una con su ruta relativa, tamaño y SHA-256.                    |
| `images/<id>.<ext>` | Copia exacta de cada imagen original. Las miniaturas no se incluyen: se regeneran al importar.                                                                                  |

Al leer un paquete, ArtGallery:

- rechaza versiones de formato más nuevas que las que entiende;
- solo acepta esas rutas exactas, así que nunca escribe fuera de su carpeta temporal (sin rutas absolutas ni `..`);
- comprueba el tamaño y el SHA-256 de cada imagen y que no falte ni sobre ninguna;
- valida todos los datos antes de aplicar nada.

Si algo falla, descarta el paquete completo y no deja una importación a medias.

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
