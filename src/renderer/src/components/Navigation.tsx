import { createContext, useContext } from "react";
import type { DocumentLinkRef } from "../../../shared/document";

/** What another section can ask Documentación to show. */
export interface DocumentsRoute {
  openId?: string;
  /** Lists only what is linked to this, named by `label`. */
  linkedTo?: DocumentLinkRef & { label: string };
}

export interface Navigation {
  showDocuments: (route: DocumentsRoute) => void;
}

export const NavigationContext = createContext<Navigation>({
  showDocuments: () => undefined,
});

export const useNavigation = () => useContext(NavigationContext);
