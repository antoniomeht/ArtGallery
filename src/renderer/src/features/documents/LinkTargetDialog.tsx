import { useEffect, useRef, useState } from "react";
import type {
  DocumentLinkRef,
  DocumentLinkType,
} from "../../../../shared/document";
import { Button } from "../../components/Button";

interface LinkTargetDialogProps {
  documentTitle: string;
  onClose: () => void;
  onChoose: (target: DocumentLinkRef) => void;
}

interface Option {
  id: string;
  label: string;
}

const TYPES: { type: DocumentLinkType; label: string }[] = [
  { type: "artwork", label: "Obra" },
  { type: "exhibition", label: "Exposición" },
  { type: "collection", label: "Colección" },
];

async function loadOptions(type: DocumentLinkType, text: string) {
  if (type === "artwork") {
    const artworks = await window.artGallery.listArtworks({
      text,
      sort: "title",
    });
    return artworks.map(({ id, title }) => ({ id, label: title }));
  }
  const matches = (label: string) =>
    label.toLocaleLowerCase("es").includes(text.trim().toLocaleLowerCase("es"));
  const list =
    type === "exhibition"
      ? (await window.artGallery.listExhibitions()).map(({ id, name }) => ({
          id,
          label: name,
        }))
      : (await window.artGallery.listCollections()).map(({ id, name }) => ({
          id,
          label: name,
        }));
  return list.filter(({ label }) => matches(label));
}

/** Picks the artwork, exhibition or collection to link a document to. */
export function LinkTargetDialog({
  documentTitle,
  onClose,
  onChoose,
}: LinkTargetDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [type, setType] = useState<DocumentLinkType>("artwork");
  const [text, setText] = useState("");
  const [options, setOptions] = useState<Option[] | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    let isCurrent = true;
    void loadOptions(type, text).then((list) => isCurrent && setOptions(list));
    return () => {
      isCurrent = false;
    };
  }, [type, text]);

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="link-target-title"
      onClose={onClose}
    >
      <div className="dialog__body">
        <h2 id="link-target-title" className="dialog__title">
          Vincular «{documentTitle}»
        </h2>
        <div className="segmented" role="radiogroup" aria-label="Vincular a">
          {TYPES.map((option) => (
            <label key={option.type} className="segmented__option">
              <input
                type="radio"
                name="link-type"
                checked={type === option.type}
                onChange={() => {
                  setType(option.type);
                  setChosenId(null);
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
        <input
          type="search"
          className="field__input"
          aria-label="Buscar"
          placeholder="Buscar por nombre"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        {options?.length === 0 && (
          <p className="dialog__message">No hay nada que coincida.</p>
        )}
        <fieldset className="choice-list">
          <legend className="visually-hidden">Destino</legend>
          {options?.map((option) => (
            <label key={option.id} className="checkbox">
              <input
                type="radio"
                name="link-target"
                checked={chosenId === option.id}
                onChange={() => setChosenId(option.id)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <div className="dialog__actions">
          <Button onClick={() => dialogRef.current?.close()}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={!chosenId}
            onClick={() => chosenId && onChoose({ type, id: chosenId })}
          >
            Vincular
          </Button>
        </div>
      </div>
    </dialog>
  );
}
