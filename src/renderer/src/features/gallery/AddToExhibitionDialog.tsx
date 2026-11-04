import { useEffect, useRef, useState } from "react";
import type { ExhibitionSummary } from "../../../../shared/exhibition";
import { Button } from "../../components/Button";

interface AddToExhibitionDialogProps {
  artworkCount: number;
  onClose: () => void;
  onChoose: (exhibition: ExhibitionSummary) => void;
}

export function AddToExhibitionDialog({
  artworkCount,
  onClose,
  onChoose,
}: AddToExhibitionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [exhibitions, setExhibitions] = useState<ExhibitionSummary[] | null>(
    null,
  );
  const [chosenId, setChosenId] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    void window.artGallery.listExhibitions().then(setExhibitions);
  }, []);

  const chosen = exhibitions?.find(({ id }) => id === chosenId);

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="add-to-exhibition-title"
      onClose={onClose}
    >
      <div className="dialog__body">
        <h2 id="add-to-exhibition-title" className="dialog__title">
          Añadir {artworkCount === 1 ? "1 obra" : `${artworkCount} obras`} a una
          exposición
        </h2>
        {exhibitions?.length === 0 && (
          <p className="dialog__message">
            Todavía no hay exposiciones. Créalas desde la sección Exposiciones.
          </p>
        )}
        {exhibitions && exhibitions.length > 0 && (
          <fieldset className="choice-list">
            <legend className="visually-hidden">Exposición</legend>
            {exhibitions.map((exhibition) => (
              <label key={exhibition.id} className="checkbox">
                <input
                  type="radio"
                  name="exhibition"
                  checked={chosenId === exhibition.id}
                  onChange={() => setChosenId(exhibition.id)}
                />
                {exhibition.name}
              </label>
            ))}
          </fieldset>
        )}
        <div className="dialog__actions">
          <Button onClick={() => dialogRef.current?.close()}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={!chosen}
            onClick={() => chosen && onChoose(chosen)}
          >
            Añadir
          </Button>
        </div>
      </div>
    </dialog>
  );
}
