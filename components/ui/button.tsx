import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost";
type ButtonSize = "default" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "border-transparent bg-gradient-to-b from-accent-500 to-accent-600 text-white shadow-sm hover:from-accent-400 hover:to-accent-500",
  outline:
    "border border-border-button-default bg-background-primary-default text-text-primary shadow-sm hover:bg-background-secondary-default",
  ghost: "border-transparent bg-transparent text-text-primary hover:bg-background-secondary-default",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-9 px-4 text-body-2-medium",
  icon: "size-9 shrink-0 p-0",
};

function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg",
        "outline-none transition-colors focus-visible:ring-2 focus-visible:ring-border-focus-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}

export { Button };
