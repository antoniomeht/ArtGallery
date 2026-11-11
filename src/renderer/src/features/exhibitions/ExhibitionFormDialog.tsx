import { useEffect, useRef } from "react";
import type { Exhibition } from "../../../../shared/exhibition";
import { ExhibitionForm } from "./ExhibitionForm";

interface ExhibitionFormDialogProps {
  onClose: () => void;
  onSaved: (exhibition: Exhibition) => void;
}

/** Creates an exhibition; existing ones are edited in their own page. */
export function ExhibitionFormDialog({
  onClose,
  onSaved,
}: ExhibitionFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog ref={dialogRef} className="dialog" onClose={onClose}>
      <ExhibitionForm
        className="dialog__body"
        onCancel={() => dialogRef.current?.close()}
        onSaved={onSaved}
      />
    </dialog>
  );
}
