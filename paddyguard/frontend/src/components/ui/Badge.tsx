import React from "react";

type BadgeColor = "amber" | "green" | "red" | "forest";

interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  className?: string;
}

const colorClasses: Record<BadgeColor, string> = {
  amber: "bg-amber-light text-amber-dark",
  green: "bg-green-soft/10 text-green-soft",
  red: "bg-red-soft/10 text-red-soft",
  forest: "bg-beige text-forest",
};

const Badge: React.FC<BadgeProps> = ({
  color = "amber",
  children,
  icon: Icon,
  className = "",
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${colorClasses[color]} ${className}`}
    >
      {Icon && <Icon size={14} />}
      {children}
    </span>
  );
};

export default Badge;
