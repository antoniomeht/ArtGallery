import { useState } from "react";
import { Sidebar, type Section } from "./components/Sidebar";
import { GalleryPage } from "./features/gallery/GalleryPage";
import { SearchPage } from "./features/search/SearchPage";
import { TrashPage } from "./features/trash/TrashPage";

export function App() {
  const [section, setSection] = useState<Section>("gallery");

  return (
    <div className="app-layout">
      <Sidebar current={section} onNavigate={setSection} />
      <main className="app-main">
        {section === "gallery" && <GalleryPage />}
        {section === "search" && <SearchPage />}
        {section === "trash" && <TrashPage />}
      </main>
    </div>
  );
}
