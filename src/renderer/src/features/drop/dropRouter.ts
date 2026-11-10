import {
  DOCUMENT_LINK_TYPES,
  type DocumentLinkRef,
} from "../../../../shared/document";
import { isSupportedImage } from "../../../../shared/media";
import type { Section } from "../../components/Sidebar";

export interface RoutedDrop {
  /** Become artworks, or images of the open record. */
  images: string[];
  /** Go to Documentación; unsupported files are reported there. */
  documents: string[];
}

/** Splits dropped files: images make artworks, anything else is a document. */
export function routeDrop(
  paths: readonly string[],
  section: Section,
): RoutedDrop {
  if (section === "documents") return { images: [], documents: [...paths] };
  return {
    images: paths.filter(isSupportedImage),
    documents: paths.filter((path) => !isSupportedImage(path)),
  };
}

/** Value of `data-drop-target` for something documents can be linked to. */
export const dropTargetValue = ({ type, id }: DocumentLinkRef) =>
  `${type}:${id}`;

export function parseDropTarget(value: string | null): DocumentLinkRef | null {
  const match = /^([a-z]+):(.+)$/.exec(value ?? "");
  if (!match) return null;
  const [, type, id] = match;
  const linkType = DOCUMENT_LINK_TYPES.find((known) => known === type);
  return linkType && id ? { type: linkType, id } : null;
}
