import React from "react";
import { XCircle, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import Button from "./ui/Button";

interface OODWarningProps {
  message: string | null;
  reason: string | null;
  onRetry: () => void;
}

const TIPS = [
  "ගොයම් කොළ ගැන විස්තර කරන්න",
  "ලප, කහ, හෝ දුඹුරු ලකුණු ගැන කියන්න",
  "ගොයම් ක්ෂේත්‍රය ගැන තොරතුරු දෙන්න",
];

const OODWarning: React.FC<OODWarningProps> = ({ message, reason, onRetry }) => {
  return (
    <div className="animate-slide-up mx-4 flex flex-col items-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-soft/10">
        <XCircle size={40} className="text-red-soft" />
      </div>

      <h2 className="font-sinhala mt-4 text-lg font-bold text-forest">
        හඳුනා ගත නොහැකිය | Unrecognised Input
      </h2>

      <div className="mt-4 w-full rounded-2xl bg-beige p-4 text-left">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber" />
          <p className="text-[13px] text-gray-muted">
            {reason || message || "Could not classify the described symptoms."}
          </p>
        </div>
        <p className="font-sinhala mt-3 text-sm text-forest">
          ගොයම් රෝගයේ ලක්ෂණ ගැන කතා කරන්න
        </p>
      </div>

      <div className="mt-4 w-full text-left">
        {TIPS.map((tip) => (
          <div key={tip} className="mb-2 flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-green-soft" />
            <span className="font-sinhala text-sm text-forest">{tip}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 w-full">
        <Button variant="primary" fullWidth icon={RefreshCw} onClick={onRetry}>
          <span className="font-sinhala">නැවත උත්සාහ කරන්න | Try Again</span>
        </Button>
      </div>
    </div>
  );
};

export default OODWarning;
