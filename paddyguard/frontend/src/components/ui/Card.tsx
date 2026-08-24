import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: string;
}

const Card: React.FC<CardProps> = ({
  hover = false,
  padding = "p-4",
  className = "",
  children,
  ...rest
}) => {
  return (
    <div
      className={`rounded-2xl bg-white shadow-card ${padding} ${
        hover ? "card-hover" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Card;
