import React from "react";
import LoadingSpinner from "./LoadingSpinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-amber text-white hover:bg-amber-dark",
  secondary: "bg-beige text-forest border border-forest/20 hover:bg-beige/70",
  ghost: "bg-transparent text-forest hover:bg-beige",
  danger: "bg-red-soft text-white hover:brightness-95",
};

const sizeClasses: Record<Size, string> = {
  lg: "h-[52px] text-base px-6",
  md: "h-[44px] text-sm px-5",
  sm: "h-[36px] text-sm px-4",
};

const iconSize: Record<Size, number> = { lg: 20, md: 18, sm: 16 };

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "lg",
  loading = false,
  fullWidth = false,
  icon: Icon,
  disabled,
  className = "",
  children,
  ...rest
}) => {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-all duration-200 active:scale-[0.96]
        disabled:cursor-not-allowed disabled:opacity-60
        ${variantClasses[variant]} ${sizeClasses[size]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...rest}
    >
      {loading ? (
        <LoadingSpinner size={iconSize[size]} />
      ) : (
        <>
          {Icon && <Icon size={iconSize[size]} />}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
