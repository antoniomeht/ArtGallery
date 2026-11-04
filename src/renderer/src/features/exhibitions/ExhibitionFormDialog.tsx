import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  exhibitionFieldsSchema,
  type Exhibition,
  type ExhibitionFieldsInput,
} from "../../../../shared/exhibition";
import { Field } from "../../components/Field";
import { Button } from "../../components/Button";

interface ExhibitionFormDialogProps {
  /** Edits this exhibition; without it the dialog creates a new one. */
  exhibition?: Exhibition;
  onClose: () => void;
  onSaved: (exhibition: Exhibition) => void;
}

type Values = Required<{ [K in keyof ExhibitionFieldsInput]: string }>;

export function ExhibitionFormDialog({
  exhibition,
  onClose,
  onSaved,
}: ExhibitionFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<Values>({
    name: exhibition?.name ?? "",
    venue: exhibition?.venue ?? "",
    startDate: exhibition?.startDate ?? "",
    endDate: exhibition?.endDate ?? "",
    description: exhibition?.description ?? "",
  });
  const [errors, setErrors] = useState<Partial<Values>>({});
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const bind = (name: keyof Values) => ({
    value: values[name],
    error: errors[name],
    onChange: (value: string) =>
      setValues((current) => ({ ...current, [name]: value })),
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = exhibitionFieldsSchema.safeParse(values);
    if (!result.success) {
      const paths = new Set(result.error.issues.map(({ path }) => path[0]));
      setErrors({
        name: paths.has("name") ? "El nombre es obligatorio." : undefined,
        endDate: paths.has("endDate")
          ? "La fecha de fin no puede ser anterior a la de inicio."
          : undefined,
      });
      return;
    }
    setSaveError(false);
    try {
      onSaved(
        exhibition
          ? await window.artGallery.updateExhibition(exhibition.id, values)
          : await window.artGallery.createExhibition(values),
      );
    } catch {
      setSaveError(true);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby="exhibition-form-title"
      onClose={onClose}
    >
      <form className="dialog__body" onSubmit={handleSubmit} noValidate>
        <h2 id="exhibition-form-title" className="dialog__title">
          {exhibition ? "Editar exposición" : "Nueva exposición"}
        </h2>
        <Field
          label="Nombre"
          required
          autoFocus
          maxLength={200}
          {...bind("name")}
        />
        <Field label="Lugar" maxLength={200} {...bind("venue")} />
        <div className="artwork-form__row">
          <Field label="Inicio" type="date" {...bind("startDate")} />
          <Field label="Fin" type="date" {...bind("endDate")} />
        </div>
        <Field label="Descripción" multiline {...bind("description")} />
        {saveError && (
          <p className="dialog__error" role="alert">
            No se pudo guardar la exposición. Inténtalo de nuevo.
          </p>
        )}
        <div className="dialog__actions">
          <Button onClick={() => dialogRef.current?.close()}>Cancelar</Button>
          <Button type="submit" variant="primary">
            {exhibition ? "Guardar cambios" : "Crear exposición"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
