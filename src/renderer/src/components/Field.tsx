import { useId, type InputHTMLAttributes } from "react";

type InputProps = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "inputMode" | "list" | "maxLength" | "autoFocus" | "required" | "type"
>;

interface FieldProps extends InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  multiline?: boolean;
  /** Keeps the label for screen readers when a group legend already shows it. */
  hideLabel?: boolean;
}

/** Labelled text input with an optional hint and an accessible error. */
export function Field({
  label,
  value,
  onChange,
  hint,
  error,
  multiline = false,
  hideLabel = false,
  ...inputProps
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const controlProps = {
    id,
    className: "field__input",
    value,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
  };

  return (
    <div className="field">
      <label
        htmlFor={id}
        className={hideLabel ? "visually-hidden" : "field__label"}
      >
        {label}
        {hint && <span className="field__hint"> ({hint})</span>}
      </label>
      {multiline ? (
        <textarea
          {...controlProps}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          {...controlProps}
          {...inputProps}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
