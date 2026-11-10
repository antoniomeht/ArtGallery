import { useMemo, useState } from "react";
import {
  NavigationContext,
  type DocumentsRoute,
} from "./components/Navigation";
import { Sidebar, type Section } from "./components/Sidebar";
import { BackupsPage } from "./features/backups/BackupsPage";
import { DocumentsPage } from "./features/documents/DocumentsPage";
import { ExhibitionsPage } from "./features/exhibitions/ExhibitionsPage";
import { GalleryPage } from "./features/gallery/GalleryPage";
import { NewArtworkLayer } from "./features/new-artwork/NewArtworkLayer";
import { useNewArtworks } from "./features/new-artwork/useNewArtworks";
import { TransferPage } from "./features/transfer/TransferPage";
import { TrashPage } from "./features/trash/TrashPage";

export function App() {
  const [section, setSection] = useState<Section>("gallery");
  const [documentsRoute, setDocumentsRoute] = useState<DocumentsRoute>({});
  const navigation = useMemo(
    () => ({
      showDocuments: (route: DocumentsRoute) => {
        setDocumentsRoute(route);
        setSection("documents");
      },
    }),
    [],
  );
  const newArtworks = useNewArtworks(() => setSection("gallery"));

  return (
    <NavigationContext value={navigation}>
      <div className="app-layout">
        <Sidebar
          current={section}
          onNavigate={(next) => {
            setDocumentsRoute({});
            setSection(next);
          }}
        />
        {/* Each section loads its data when shown, so after a restore the
          other sections are up to date without extra wiring. */}
        <main className="app-main">
          {section === "gallery" && (
            <GalleryPage
              inventoryVersion={newArtworks.inventoryVersion}
              onAdd={() => void newArtworks.pickImages()}
            />
          )}
          {section === "exhibitions" && <ExhibitionsPage />}
          {section === "documents" && (
            <DocumentsPage
              key={JSON.stringify(documentsRoute)}
              route={documentsRoute}
            />
          )}
          {section === "transfer" && <TransferPage />}
          {section === "backups" && <BackupsPage />}
          {section === "trash" && <TrashPage />}
        </main>
        <NewArtworkLayer newArtworks={newArtworks} />
      </div>
    </NavigationContext>
  );
}
