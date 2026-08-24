import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 20,
  className = "",
}) => {
  return (
    <Loader2 size={size} className={`animate-spin ${className}`} strokeWidth={2.5} />
  );
};

export default LoadingSpinner;
