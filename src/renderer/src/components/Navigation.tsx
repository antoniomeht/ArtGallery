import { createContext, useContext } from "react";
import type { DocumentLinkRef } from "../../../shared/document";

/** What another section can ask Documentación to show. */
export interface DocumentsRoute {
  openId?: string;
  /** Lists only what is linked to this, named by `label`. */
  linkedTo?: DocumentLinkRef & { label: string };
}

export interface Navigation {
  /** Changes when documents are added from outside a page, e.g. dropped. */
  documentsVersion: number;
  showDocuments: (route: DocumentsRoute) => void;
}

export const NavigationContext = createContext<Navigation>({
  documentsVersion: 0,
  showDocuments: () => undefined,
});

export const useNavigation = () => useContext(NavigationContext);
