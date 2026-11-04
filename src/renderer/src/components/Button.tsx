import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger";
}

/** Text button of the design system. Does not submit forms unless asked to. */
export function Button({
  variant = "default",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  const classes = [
    "button",
    variant !== "default" && `button--${variant}`,
    className,
  ];
  return (
    <button
      type={type}
      className={classes.filter(Boolean).join(" ")}
      {...props}
    />
  );
}
