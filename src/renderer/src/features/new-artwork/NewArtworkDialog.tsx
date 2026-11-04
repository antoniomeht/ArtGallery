import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Field } from "../../components/Field";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import "./NewArtworkDialog.css";

interface NewArtworkDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function NewArtworkDialog({
  onClose,
  onCreated,
}: NewArtworkDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function chooseImages() {
    const chosen = await window.artGallery.pickImages();
    setImagePaths((current) => [...new Set([...current, ...chosen])]);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await window.artGallery.createArtwork({ title, artist, imagePaths });
      onCreated();
    } catch {
      setError(
        "No se pudo guardar la obra. Comprueba que las imágenes son JPG, PNG, WebP o TIFF y vuelve a intentarlo.",
      );
      setIsSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="new-artwork-title"
      onClose={onClose}
    >
      <form className="dialog__body" onSubmit={handleSubmit}>
        <h2 id="new-artwork-title" className="dialog__title">
          Nueva obra
        </h2>

        <Field
          label="Título"
          value={title}
          onChange={setTitle}
          required
          maxLength={300}
          autoFocus
        />
        <Field
          label="Artista"
          hint="opcional"
          value={artist}
          onChange={setArtist}
          maxLength={300}
        />

        <div className="field">
          <span className="field__label">Imágenes</span>
          {imagePaths.length > 0 && (
            <ul className="image-list">
              {imagePaths.map((path, index) => (
                <li key={path} className="image-list__item">
                  <span className="image-list__name">{fileNameOf(path)}</span>
                  {index === 0 && (
                    <span className="image-list__badge">Principal</span>
                  )}
                  <IconButton
                    aria-label={`Quitar ${fileNameOf(path)}`}
                    onClick={() =>
                      setImagePaths((current) =>
                        current.filter((item) => item !== path),
                      )
                    }
                  >
                    <X aria-hidden size={16} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
          <Button onClick={chooseImages}>
            <ImagePlus aria-hidden size={16} />
            Elegir imágenes…
          </Button>
        </div>

        {error && (
          <p className="dialog__error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog__actions">
          <Button onClick={() => dialogRef.current?.close()}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Guardando…" : "Añadir obra"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
