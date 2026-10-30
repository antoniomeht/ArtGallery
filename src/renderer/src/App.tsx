import { Sidebar } from "./components/Sidebar";
import { GalleryPage } from "./features/gallery/GalleryPage";

export function App() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <GalleryPage />
      </main>
    </div>
  );
}
