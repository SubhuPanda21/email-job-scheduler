import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "secondary" | "ghost";
const styles: Record<Variant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600",
  outline: "border border-brand-500 text-brand-600 hover:bg-brand-50",
  secondary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
  ghost: "text-gray-500 hover:text-gray-900",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
