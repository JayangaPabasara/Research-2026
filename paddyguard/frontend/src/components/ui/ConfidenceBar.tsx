import React from "react";
import { getDiseaseColor } from "../../lib/disease";

interface ConfidenceBarProps {
  disease: string;
  confidence: number;
  allScores: Record<string, number>;
}

const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ disease, allScores }) => {
  const entries = Object.entries(allScores);

  return (
    <div className="flex flex-col gap-3">
      {entries.map(([name, score]) => {
        const pct = Math.round(score * 100);
        const isWinner = name === disease;
        const color = getDiseaseColor(name);
        return (
          <div key={name}>
            <div className="mb-1 flex items-center justify-between">
              <span
                className={`text-xs ${
                  isWinner ? "font-bold text-forest" : "font-medium text-forest/70"
                }`}
              >
                {name}
              </span>
              <span
                className={`text-xs ${
                  isWinner ? "font-bold" : "font-medium text-gray-muted"
                }`}
                style={isWinner ? { color } : undefined}
              >
                {pct}%
              </span>
            </div>
            <div
              className={`w-full overflow-hidden rounded-full bg-beige ${
                isWinner ? "h-[10px]" : "h-2"
              }`}
            >
              <div
                className="h-full animate-bar-fill rounded-full"
                style={
                  {
                    backgroundColor: color,
                    "--bar-width": `${pct}%`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConfidenceBar;
