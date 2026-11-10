import { useEffect, useRef, useState } from "react";

interface FileDropOptions {
  /** Decides, at drop time, whether this handler should take the files. */
  isActive: () => boolean;
  /** `target` is the element under the pointer when the files were dropped. */
  onDrop: (paths: string[], target: Element | null) => void;
}

const carriesFiles = (event: DragEvent) =>
  event.dataTransfer?.types.includes("Files") ?? false;

/**
 * Takes files dropped anywhere on the window. Returns whether files are being
 * dragged over it and this handler would receive them.
 */
export function useFileDrop({ isActive, onDrop }: FileDropOptions): boolean {
  const [isDragging, setIsDragging] = useState(false);
  const latest = useRef({ isActive, onDrop });
  useEffect(() => {
    latest.current = { isActive, onDrop };
  });

  useEffect(() => {
    const handleOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      // Without this the browser would open the file instead of dropping it.
      event.preventDefault();
      setIsDragging(latest.current.isActive());
    };
    const handleLeave = (event: DragEvent) => {
      // Moving between elements also fires this, with a related target.
      if (!event.relatedTarget) setIsDragging(false);
    };
    const handleDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      setIsDragging(false);
      if (!latest.current.isActive()) return;
      const paths = [...(event.dataTransfer?.files ?? [])]
        .map((file) => window.artGallery.pathForFile(file))
        .filter(Boolean);
      const target = event.target instanceof Element ? event.target : null;
      if (paths.length > 0) latest.current.onDrop(paths, target);
    };

    window.addEventListener("dragover", handleOver);
    window.addEventListener("dragleave", handleLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragover", handleOver);
      window.removeEventListener("dragleave", handleLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  return isDragging;
}
