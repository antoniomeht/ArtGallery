import type { ButtonHTMLAttributes } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** An icon alone says nothing to a screen reader, so a name is required. */
  "aria-label": string;
}

/** Small button holding only an icon. */
export function IconButton({ className, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={["icon-button", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
