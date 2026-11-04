import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ExhibitionSummary } from "../../../../shared/exhibition";
import { formatDateRange } from "../../../../shared/exhibitionFormat";
import { thumbnailUrl } from "../../../../shared/media";
import { ExhibitionDetailView } from "./ExhibitionDetailView";
import { ExhibitionFormDialog } from "./ExhibitionFormDialog";
import { Button } from "../../components/Button";
import "./ExhibitionsPage.css";

export function ExhibitionsPage() {
  const [exhibitions, setExhibitions] = useState<ExhibitionSummary[] | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(() => {
    window.artGallery
      .listExhibitions()
      .then(setExhibitions, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  if (openId) {
    return (
      <ExhibitionDetailView
        exhibitionId={openId}
        onBack={() => {
          setOpenId(null);
          load();
        }}
      />
    );
  }

  const createButton = (
    <Button variant="primary" onClick={() => setIsCreating(true)}>
      <Plus aria-hidden size={16} />
      Nueva exposición
    </Button>
  );

  return (
    <section className="exhibitions" aria-labelledby="exhibitions-title">
      <header className="page-header">
        <h1 id="exhibitions-title" className="page-header__title">
          Exposiciones
        </h1>
        {exhibitions && exhibitions.length > 0 && (
          <div className="page-header__action">{createButton}</div>
        )}
      </header>

      {failed && (
        <p className="exhibitions__status" role="alert">
          No se pudieron leer las exposiciones.
        </p>
      )}
      {exhibitions?.length === 0 && (
        <div className="gallery-empty">
          <p className="gallery-empty__text">
            Agrupa obras en una exposición con su lugar y sus fechas, ordénalas
            y prepara su catálogo y sus cartelas en PDF.
          </p>
          {createButton}
        </div>
      )}

      {exhibitions && exhibitions.length > 0 && (
        <ul className="exhibition-list">
          {exhibitions.map((exhibition) => (
            <li key={exhibition.id}>
              <button
                type="button"
                className="exhibition-card"
                onClick={() => setOpenId(exhibition.id)}
              >
                {exhibition.coverImageId ? (
                  <img
                    className="exhibition-card__cover"
                    src={thumbnailUrl(exhibition.coverImageId)}
                    alt=""
                  />
                ) : (
                  <span className="exhibition-card__cover" aria-hidden />
                )}
                <span className="exhibition-card__name">{exhibition.name}</span>
                <span className="exhibition-card__meta">
                  {[
                    exhibition.venue,
                    formatDateRange(exhibition),
                    exhibition.artworkCount === 1
                      ? "1 obra"
                      : `${exhibition.artworkCount} obras`,
                  ]
                    .filter(Boolean)
                    .join(". ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isCreating && (
        <ExhibitionFormDialog
          onClose={() => setIsCreating(false)}
          onSaved={(exhibition) => {
            setIsCreating(false);
            setOpenId(exhibition.id);
          }}
        />
      )}
    </section>
  );
}
