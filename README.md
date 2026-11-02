# ArtGallery

Inventario personal de cuadros, pinturas y dibujos para Windows y macOS. Funciona sin conexión, sin cuentas y sin servicios externos: los datos y las imágenes se guardan en el propio equipo.

> **Estado:** en desarrollo. Ya se pueden añadir obras, verlas en la galería, consultar y editar su ficha completa, gestionar sus imágenes y recuperar obras desde la papelera, además de buscar y filtrar el inventario. También hace copias de seguridad manuales y automáticas y las restaura. Permite exportar e importar obras entre equipos y exportar los metadatos a CSV. También organiza exposiciones con su selección ordenada de obras y genera su catálogo y sus cartelas en PDF.

![Galería con obras de demostración](screenshots/gallery.png)

| Ficha de la obra                             | Búsqueda y filtros                                   |
| -------------------------------------------- | ---------------------------------------------------- |
| ![Ficha de una obra](screenshots/record.png) | ![Búsqueda combinada](screenshots/search.png)        |
| **Exposición**                               | **Cartelas**                                         |
| ![Exposición](screenshots/exhibition.png)    | ![Cartelas con vista previa](screenshots/labels.png) |

Las capturas se tomaron con los datos de demostración (`npm run demo`).

## Funciones disponibles

- Galería en cuadrícula con las imágenes como protagonistas, ordenable por fecha de incorporación, título (sin distinguir tildes ni mayúsculas) o año.
- Exposiciones con nombre, lugar, fechas y descripción, y una selección ordenada de obras. Se pueden añadir obras desde la exposición o desde la selección múltiple de la galería.
- Catálogo de la exposición en PDF (A4), generado sin conexión: portada con la obra principal, lugar, fechas y descripción, y después cada obra en orden con su miniatura y su cartela (artista, título, año, técnica, dimensiones y, si se elige, precio).
- Cartelas para colocar junto a las obras, desde una exposición o desde una selección de la galería: datos visibles a elegir (artista, título, año, técnica y soporte, dimensiones, precio), tamaños predefinidos o personalizados, vista previa y reparto automático en hojas A4 con márgenes de 10 mm y líneas de corte.
- Copias de seguridad manuales y automáticas (diarias o semanales) con retención configurable, verificación completa de cada copia y restauración segura.
- Exportación de todo el inventario, de una selección o de una exposición (con sus obras y su orden) a un archivo `.artgallery` portátil, e importación con resumen previo y elección de qué hacer con lo que ya existe (mantener, sustituir o duplicar).
- Exportación de metadatos a CSV (separado por `;`, con BOM UTF-8 para Excel y protegido frente a fórmulas). El CSV no incluye imágenes y no sustituye a una copia de seguridad.
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

## Copias de seguridad y recuperación

Desde **Copias y ajustes**:

- **Qué incluye una copia**: un archivo `.artgallery` con todo el inventario (papelera incluida) y los originales de todas las imágenes. Tras escribirla, ArtGallery la vuelve a leer completa y comprueba cada imagen antes de darla por buena.
- **Dónde se guarda**: por defecto en `Documentos/ArtGallery/Copias de seguridad`, fuera de la instalación y de la carpeta de datos. La carpeta se puede cambiar, por ejemplo a un disco externo o a una carpeta sincronizada.
- **Copias automáticas**: diarias (por defecto), semanales o desactivadas. Se comprueban al iniciar la aplicación y cada hora mientras está abierta, y no se crean si el inventario está vacío. Se conservan las más recientes (10 por defecto); las copias manuales nunca se borran automáticamente.
- **Restaurar**:
  1. ArtGallery valida la copia entera; si algo falla, el inventario no se toca.
  2. Guarda el inventario actual como copia «antes de restaurar».
  3. Sustituye el inventario en una sola transacción.

  Se puede restaurar desde la lista o desde cualquier archivo `.artgallery`.

### Qué ocurre al desinstalar y reinstalar

- **Se conserva, si el sistema lo permite:** la carpeta de datos. El instalador de Windows no la borra, pero el usuario, otras herramientas o una limpieza del sistema sí pueden eliminarla. En macOS, arrastrar la app a la papelera no la elimina.
- **Depende de ti:** las copias de seguridad. Tras reinstalar, ArtGallery busca las copias en la carpeta por defecto y las muestra para restaurarlas. Si las moviste, basta con elegir su carpeta o abrir el archivo.
- **No se puede recuperar:** si se han eliminado tanto la carpeta de datos como todas las copias, el inventario se pierde. Conviene guardar copias también fuera del equipo.

## Formato portátil `.artgallery`

Las copias de seguridad y las exportaciones usan un mismo formato documentado y versionado: un archivo ZIP con extensión `.artgallery`.

| Entrada             | Contenido                                                                                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manifest.json`     | `format: "artgallery"`, `formatVersion` (actualmente `2`; se siguen leyendo paquetes `1`), `kind` (`backup` para el inventario completo o `artworks` para una selección), fecha, versión de la app y recuentos.                   |
| `data.json`         | Obras con todos sus campos, etiquetas, fechas y la lista ordenada de imágenes (la primera es la principal), cada una con su ruta relativa, tamaño y SHA-256. Desde la versión 2, también las exposiciones con sus obras en orden. |
| `images/<id>.<ext>` | Copia exacta de cada imagen original. Las miniaturas no se incluyen: se regeneran al importar.                                                                                                                                    |

Al leer un paquete, ArtGallery:

- rechaza versiones de formato más nuevas que las que entiende;
- solo acepta esas rutas exactas, así que nunca escribe fuera de su carpeta temporal (sin rutas absolutas ni `..`);
- comprueba el tamaño y el SHA-256 de cada imagen y que no falte ni sobre ninguna;
- valida todos los datos antes de aplicar nada.

Si algo falla, descarta el paquete completo y no deja una importación a medias.

## Datos de demostración

`npm run demo` abre la aplicación en modo desarrollo sobre una carpeta propia (`.demo/`, ignorada por Git) con 8 obras y una exposición. Los artistas y los títulos son ficticios y las imágenes son composiciones abstractas generadas por código, así que no hay derechos de terceros. El modo demo no lee ni modifica tus datos ni tus copias, y no existe en la aplicación instalada.

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
