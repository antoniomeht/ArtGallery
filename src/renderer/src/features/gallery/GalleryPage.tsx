import "./GalleryPage.css";

export function GalleryPage() {
  return (
    <section className="gallery-page" aria-labelledby="gallery-title">
      <header className="page-header">
        <h1 id="gallery-title" className="page-header__title">
          Galería
        </h1>
      </header>
      <div className="gallery-empty">
        <div className="gallery-empty__frame" aria-hidden />
        <p className="gallery-empty__text">
          Aún no hay obras en el inventario.
        </p>
      </div>
    </section>
  );
}
