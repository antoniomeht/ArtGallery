import { useState } from "react";
import { Sidebar, type Section } from "./components/Sidebar";
import { BackupsPage } from "./features/backups/BackupsPage";
import { GalleryPage } from "./features/gallery/GalleryPage";
import { SearchPage } from "./features/search/SearchPage";
import { TrashPage } from "./features/trash/TrashPage";

export function App() {
  const [section, setSection] = useState<Section>("gallery");

  return (
    <div className="app-layout">
      <Sidebar current={section} onNavigate={setSection} />
      {/* Each section loads its data when shown, so after a restore the
          other sections are up to date without extra wiring. */}
      <main className="app-main">
        {section === "gallery" && <GalleryPage />}
        {section === "search" && <SearchPage />}
        {section === "backups" && <BackupsPage />}
        {section === "trash" && <TrashPage />}
      </main>
    </div>
  );
}
