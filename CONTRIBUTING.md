# Contribuir a ArtGallery

Gracias por tu interés. ArtGallery es un proyecto personal pequeño, así que las contribuciones funcionan mejor si son concretas y van paso a paso.

## Antes de empezar

- Para errores, abre un issue con la plantilla de error e incluye los pasos para reproducirlo. Si afecta a datos, explica qué se perdió o cambió.
- Para cambios grandes, abre antes un issue para hablarlo.
- No adjuntes bases de datos, copias de seguridad ni fotografías reales: pueden contener datos personales.

## Entorno

Requisitos: Node.js 24 y npm.

```bash
npm ci
npm run demo   # la aplicación con datos de demostración, sin tocar tus datos
```

## Forma de trabajar

- Crea una rama desde `main` (`feature/…`, `fix/…` o `docs/…`).
- Haz commits pequeños con un mensaje en inglés que empiece por una de estas etiquetas:
  - `[Added]` para funciones nuevas;
  - `[Changed]` para cambios o refactorizaciones sin función nueva;
  - `[Fixed]` para correcciones;
  - `[Documentation]` para documentación.

  Por ejemplo: `[Added] Gallery sorting by year`.

- Una pull request debe resolver una sola cosa. Su descripción explica el problema, el resultado, cómo se ha validado y las limitaciones. Añade capturas si cambia algo visual.
- Las PR se integran con _squash merge_ cuando el CI está en verde.

## Criterios del código

- La interfaz está en español; el código, los comentarios y los commits, en inglés.
- La lógica de datos vive en `src/main`; la interfaz solo habla con ella a través de la API del preload (`src/shared/api.ts`).
- Toda entrada que cruza un límite (formularios, IPC, paquetes importados) se valida con los esquemas de `src/shared`.
- Las operaciones que escriben datos deben ser atómicas: o se aplican enteras o no cambian nada.
- Las pruebas deben proteger el inventario (persistencia, migraciones, copias, importación, exportación, imágenes). No añadas pruebas triviales solo para subir la cobertura.
- Antes de abrir la PR:

  ```bash
  npm run format:check && npm run lint && npm run typecheck && npm test
  ```

## Cambios en el formato de datos

- Una migración publicada no se modifica nunca: se añade una nueva al final de `src/main/database/migrations.ts`.
- Si cambia el formato `.artgallery`, sube `PACKAGE_FORMAT_VERSION`, mantén la lectura de las versiones anteriores y actualiza la sección del formato en el README.
