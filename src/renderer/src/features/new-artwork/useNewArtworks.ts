import { useCallback, useEffect, useRef, useState } from "react";
import type { CreationProgress } from "../../../../shared/artwork";
import { isSupportedImage } from "../../../../shared/media";
import { useActionNotice } from "../../hooks/useActionNotice";
import type { Section } from "../../components/Sidebar";
import { useFileDrop } from "../../hooks/useFileDrop";
import { routeDrop } from "../drop/dropRouter";

const fileNameOf = (path: string) => path.split(/[\\/]/).pop() ?? path;

/**
 * Adds artworks from images, chosen or dropped on the window. A single image
 * opens its record for editing; several become artworks without interrupting.
 */
export function useNewArtworks(onAdded: () => void, section: Section) {
  const sectionRef = useRef(section);
  useEffect(() => {
    sectionRef.current = section;
  });
  const [inventoryVersion, setInventoryVersion] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const refresh = useCallback(() => setInventoryVersion((v) => v + 1), []);
  const { notice, setNotice, moveToTrash } = useActionNotice(refresh);
  const [progress, setProgress] = useState<CreationProgress | null>(null);
  const isCreating = useRef(false);

  async function addFromPaths(paths: string[]) {
    // One addition at a time; its progress dialog blocks the rest of the app.
    if (isCreating.current) return;
    const images = paths.filter(isSupportedImage);
    const ignored = paths.length - images.length;
    if (images.length === 0) {
      setNotice({
        message: `«${fileNameOf(paths[0] ?? "")}» no es una imagen. Usa JPG, PNG, WebP o TIFF.`,
      });
      return;
    }

    isCreating.current = true;
    setProgress({ done: 0, total: images.length, fileName: "" });
    const stopListening = window.artGallery.onCreationProgress(setProgress);
    try {
      const created = await window.artGallery.createArtworksFromImages(images);
      onAdded();
      refresh();
      const ignoredNote =
        ignored > 0 ? ` ${ignored} sin añadir por no ser imágenes.` : "";
      const [first] = created;
      if (first && created.length === 1) {
        setEditingId(first.id);
        setNotice(ignoredNote ? { message: ignoredNote.trim() } : null);
      } else {
        const ids = created.map(({ id }) => id);
        setNotice({
          message: `${created.length} obras añadidas a la galería.${ignoredNote}`,
          undo: async () => {
            await window.artGallery.moveToTrash(ids);
            refresh();
          },
        });
      }
    } catch {
      setNotice({
        message:
          "No se pudo añadir ninguna obra. Comprueba que las imágenes no están dañadas.",
      });
    } finally {
      stopListening();
      setProgress(null);
      isCreating.current = false;
    }
  }

  const isDragging = useFileDrop({
    // Any open dialog, such as a record, takes priority over adding artworks.
    isActive: () => !document.querySelector("dialog[open]"),
    onDrop: (paths) => {
      const { images } = routeDrop(paths, sectionRef.current);
      if (images.length > 0) void addFromPaths(images);
    },
  });

  return {
    isDragging,
    progress,
    inventoryVersion,
    editingId,
    notice,
    setNotice,
    moveToTrash,
    refresh,
    closeEditing: () => setEditingId(null),
    pickImages: async () => {
      const paths = await window.artGallery.pickImages();
      if (paths.length > 0) await addFromPaths(paths);
    },
  };
}
