import { useState } from "react";
import { Sidebar, type Section } from "./components/Sidebar";
import { BackupsPage } from "./features/backups/BackupsPage";
import { ExhibitionsPage } from "./features/exhibitions/ExhibitionsPage";
import { GalleryPage } from "./features/gallery/GalleryPage";
import { NewArtworkLayer } from "./features/new-artwork/NewArtworkLayer";
import { useNewArtworks } from "./features/new-artwork/useNewArtworks";
import { SearchPage } from "./features/search/SearchPage";
import { TransferPage } from "./features/transfer/TransferPage";
import { TrashPage } from "./features/trash/TrashPage";

export function App() {
  const [section, setSection] = useState<Section>("gallery");
  const newArtworks = useNewArtworks(() => setSection("gallery"));

  return (
    <div className="app-layout">
      <Sidebar current={section} onNavigate={setSection} />
      {/* Each section loads its data when shown, so after a restore the
          other sections are up to date without extra wiring. */}
      <main className="app-main">
        {section === "gallery" && (
          <GalleryPage
            inventoryVersion={newArtworks.inventoryVersion}
            onAdd={() => void newArtworks.pickImages()}
          />
        )}
        {section === "search" && <SearchPage />}
        {section === "exhibitions" && <ExhibitionsPage />}
        {section === "transfer" && <TransferPage />}
        {section === "backups" && <BackupsPage />}
        {section === "trash" && <TrashPage />}
      </main>
      <NewArtworkLayer newArtworks={newArtworks} />
    </div>
  );
}
