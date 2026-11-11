import { useCallback, useMemo, useState } from "react";
import {
  NavigationContext,
  type DocumentsRoute,
} from "./components/Navigation";
import { Sidebar, type Section } from "./components/Sidebar";
import { BackupsPage } from "./features/backups/BackupsPage";
import { DocumentsPage } from "./features/documents/DocumentsPage";
import { DropHint } from "./features/drop/DropHint";
import { LinkOnDropDialog } from "./features/drop/LinkOnDropDialog";
import { TopBanner } from "./features/drop/TopBanner";
import { UpdateNotice } from "./features/update/UpdateNotice";
import { useDocumentDrop } from "./features/drop/useDocumentDrop";
import { useTopBanner } from "./features/drop/useTopBanner";
import { ExhibitionsPage } from "./features/exhibitions/ExhibitionsPage";
import { GalleryPage } from "./features/gallery/GalleryPage";
import { NewArtworkLayer } from "./features/new-artwork/NewArtworkLayer";
import { useNewArtworks } from "./features/new-artwork/useNewArtworks";
import { TransferPage } from "./features/transfer/TransferPage";
import { TrashPage } from "./features/trash/TrashPage";

export function App() {
  const [section, setSection] = useState<Section>("gallery");
  const [documentsRoute, setDocumentsRoute] = useState<DocumentsRoute>({});
  // Every visit starts Documentación afresh, even from Documentación itself.
  const [documentsVisit, setDocumentsVisit] = useState(0);
  const visitDocuments = useCallback((route: DocumentsRoute) => {
    setDocumentsRoute(route);
    setDocumentsVisit((current) => current + 1);
  }, []);
  const [documentsVersion, setDocumentsVersion] = useState(0);
  const navigation = useMemo(
    () => ({
      documentsVersion,
      showDocuments: (route: DocumentsRoute) => {
        visitDocuments(route);
        setSection("documents");
      },
    }),
    [documentsVersion, visitDocuments],
  );
  const newArtworks = useNewArtworks(() => setSection("gallery"), section);
  const topBanner = useTopBanner();
  const documentsChanged = useCallback(
    () => setDocumentsVersion((current) => current + 1),
    [],
  );
  const documentDrop = useDocumentDrop(
    section,
    topBanner.show,
    documentsChanged,
  );

  return (
    <NavigationContext value={navigation}>
      <div className="app-layout">
        <Sidebar
          current={section}
          onNavigate={(next) => {
            visitDocuments({});
            setSection(next);
          }}
        />
        {/* Each section loads its data when shown, so after a restore the
          other sections are up to date without extra wiring. */}
        <main className="app-main">
          <TopBanner topBanner={topBanner} />
          <UpdateNotice />
          {section === "gallery" && (
            <GalleryPage
              inventoryVersion={newArtworks.inventoryVersion}
              onAdd={() => void newArtworks.pickImages()}
            />
          )}
          {section === "exhibitions" && <ExhibitionsPage />}
          {section === "documents" && (
            <DocumentsPage key={documentsVisit} route={documentsRoute} />
          )}
          {section === "transfer" && <TransferPage />}
          {section === "backups" && <BackupsPage />}
          {section === "trash" && <TrashPage />}
        </main>
        <NewArtworkLayer newArtworks={newArtworks} />
        {(newArtworks.isDragging || documentDrop.isDragging) && (
          <DropHint section={section} />
        )}
        {documentDrop.pendingLink && (
          <LinkOnDropDialog
            pending={documentDrop.pendingLink}
            onDecide={(link) => void documentDrop.decideLink(link)}
          />
        )}
      </div>
    </NavigationContext>
  );
}
