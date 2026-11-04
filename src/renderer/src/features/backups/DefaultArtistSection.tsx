import { useState } from "react";
import { Field } from "../../components/Field";

interface DefaultArtistSectionProps {
  value: string;
  onSave: (defaultArtist: string) => void;
}

export function DefaultArtistSection({
  value,
  onSave,
}: DefaultArtistSectionProps) {
  const [draft, setDraft] = useState(value);

  return (
    <section className="page-section" aria-labelledby="new-artworks">
      <h2 id="new-artworks" className="page-section__title">
        Obras nuevas
      </h2>
      <div className="settings-row">
        <Field
          label="Artista predeterminado"
          value={draft}
          onChange={setDraft}
          onBlur={() => {
            if (draft !== value) onSave(draft);
          }}
          maxLength={300}
        />
      </div>
      <p className="page-section__hint">
        Se rellena en cada obra nueva. Las obras ya guardadas no cambian.
      </p>
    </section>
  );
}
