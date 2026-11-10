import { useEffect, useRef, useState } from "react";
import type {
  DocumentLinkRef,
  UploadResult,
} from "../../../../shared/document";
import type { Section } from "../../components/Sidebar";
import { useFileDrop } from "../../hooks/useFileDrop";
import { uploadSummary } from "../documents/documentText";
import { parseDropTarget, routeDrop } from "./dropRouter";
import type { Banner } from "./useTopBanner";

export interface PendingLink {
  target: DocumentLinkRef;
  label: string;
  result: UploadResult;
}

const TARGET_SELECTOR = "[data-drop-target]";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/tiff"];

/** Drops are taken with no dialog open, or with only a record open. */
function isDropAllowed(): boolean {
  const open = document.querySelectorAll("dialog[open]");
  return (
    open.length === 0 || (open.length === 1 && open[0]!.matches(".record"))
  );
}

/** Whether the dragged files include anything that is not an artwork image. */
function carriesDocuments(event: DragEvent, section: Section): boolean {
  if (section === "documents") return true;
  const items = [...(event.dataTransfer?.items ?? [])];
  return items.some((item) => !IMAGE_TYPES.includes(item.type));
}

/**
 * Uploads dropped documents. Dropped on an artwork, collection or exhibition,
 * it asks whether to link them; then reports what happened in the banner.
 */
export function useDocumentDrop(
  section: Section,
  showBanner: (banner: Banner) => void,
  onUploaded: (result: UploadResult) => void,
) {
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null);
  const sectionRef = useRef(section);
  useEffect(() => {
    sectionRef.current = section;
  });

  function report(result: UploadResult, linkedTo?: string) {
    const summary = uploadSummary(result);
    const linked =
      linkedTo && summary.tone === "success"
        ? ` · ${result.added.length === 1 ? "vinculado" : "vinculados"} a «${linkedTo}»`
        : "";
    showBanner({ ...summary, message: summary.message + linked, result });
  }

  const isDragging = useFileDrop({
    isActive: isDropAllowed,
    onDrop: async (paths, element) => {
      // With a record open its images belong to the record, on any page.
      const isRecordOpen = document.querySelector("dialog.record[open]");
      const { documents } = routeDrop(
        paths,
        isRecordOpen ? "gallery" : sectionRef.current,
      );
      if (documents.length === 0) return;
      const result = await window.artGallery.uploadDocuments(documents);
      onUploaded(result);
      const targetElement = element?.closest(TARGET_SELECTOR);
      const target = parseDropTarget(
        targetElement?.getAttribute("data-drop-target") ?? null,
      );
      if (target && result.added.length > 0) {
        setPendingLink({
          target,
          label: targetElement?.getAttribute("data-drop-label") ?? "",
          result,
        });
      } else {
        report(result);
      }
    },
  });

  // Marks link targets while documents are dragged, and the one under the pointer.
  useEffect(() => {
    let hovered: Element | null = null;
    const setHovered = (next: Element | null) => {
      if (next === hovered) return;
      hovered?.classList.remove("is-drop-hover");
      next?.classList.add("is-drop-hover");
      hovered = next;
    };
    const clear = () => {
      setHovered(null);
      delete document.body.dataset.draggingDocuments;
    };
    const handleOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      if (!isDropAllowed() || !carriesDocuments(event, sectionRef.current)) {
        clear();
        return;
      }
      document.body.dataset.draggingDocuments = "";
      const element = event.target instanceof Element ? event.target : null;
      setHovered(element?.closest(TARGET_SELECTOR) ?? null);
    };
    const handleLeave = (event: DragEvent) => {
      if (!event.relatedTarget) clear();
    };
    window.addEventListener("dragover", handleOver);
    window.addEventListener("dragleave", handleLeave);
    window.addEventListener("drop", clear);
    return () => {
      window.removeEventListener("dragover", handleOver);
      window.removeEventListener("dragleave", handleLeave);
      window.removeEventListener("drop", clear);
      clear();
    };
  }, []);

  async function decideLink(link: boolean) {
    if (!pendingLink) return;
    const { target, label, result } = pendingLink;
    setPendingLink(null);
    if (link) {
      await window.artGallery.linkDocuments(
        result.added.map(({ id }) => id),
        target,
      );
    }
    onUploaded(result);
    report(result, link ? label : undefined);
  }

  return { isDragging, pendingLink, decideLink };
}
