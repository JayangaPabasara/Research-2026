import React from "react";
import { CheckCircle, Mic, Type, Leaf, RefreshCw, Share2 } from "lucide-react";
import type { DiagnosisResult as DiagnosisResultType } from "../services/api";
import { getDiseaseColor, getDiseaseIcon, getDiseaseNameSi } from "../lib/disease";
import Card from "./ui/Card";
import ConfidenceBar from "./ui/ConfidenceBar";
import Button from "./ui/Button";
import { useNavigate } from "react-router-dom";

interface DiagnosisResultProps {
  result: DiagnosisResultType;
  onRetry?: () => void;
}

const DiagnosisResult: React.FC<DiagnosisResultProps> = ({ result, onRetry }) => {
  const navigate = useNavigate();
  const color = getDiseaseColor(result.disease);
  const Icon = getDiseaseIcon(result.disease);
  const pct = Math.round(result.confidence * 100);
  const confident = result.confidence >= 0.6;

  const handleShare = async () => {
    const text = `PaddyGuard AI: ${result.disease} (${pct}%)`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* user cancelled */
      }
    }
  };

  return (
    <div className="animate-slide-up flex flex-col gap-3">
      <Card className="mx-4" style={{ borderLeft: `4px solid ${color}` }}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${color}1A` }}
          >
            <Icon size={28} style={{ color }} />
          </div>
          <div>
            <h2 className="text-[22px] font-bold" style={{ color }}>
              {result.disease}
            </h2>
            <p className="font-sinhala text-sm text-forest/70">
              {getDiseaseNameSi(result.disease)}
            </p>
          </div>
        </div>

        <div
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full"
          style={{ backgroundColor: `${color}1A` }}
        >
          <CheckCircle size={18} style={{ color }} />
          <span className="font-sinhala text-sm font-bold" style={{ color }}>
            {confident ? "විශ්වාසදායී | Confident" : "අඩු විශ්වාසය | Low confidence"} — {pct}%
          </span>
        </div>
      </Card>

      <div className="mx-4 mt-1 rounded-xl bg-beige p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-muted">
          හඬ පිටපත | Transcript
        </p>
        <div className="flex items-start gap-2">
          <Mic size={14} className="mt-0.5 shrink-0 text-gray-muted" />
          <p className="font-sinhala text-sm text-forest">
            <span className="font-semibold">සිංහල:</span> {result.sinhala_transcript}
          </p>
        </div>
        <div className="my-2 h-px bg-forest/10" />
        <div className="flex items-start gap-2">
          <Type size={14} className="mt-0.5 shrink-0 text-gray-muted" />
          <p className="text-sm text-forest">
            <span className="font-semibold">English:</span> {result.english_translation}
          </p>
        </div>
      </div>

      <Card className="mx-4">
        <ConfidenceBar
          disease={result.disease}
          confidence={result.confidence}
          allScores={result.all_scores}
        />
      </Card>

      <div className="mx-4 mt-1 flex flex-col gap-3">
        <Button
          variant="primary"
          fullWidth
          icon={Leaf}
          onClick={() => navigate("/treatment")}
        >
          <span className="font-sinhala">ප්‍රතිකාර බලන්න | Get Treatment</span>
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" icon={RefreshCw} fullWidth onClick={onRetry}>
            <span className="font-sinhala">නැවත | New</span>
          </Button>
          <Button variant="secondary" icon={Share2} fullWidth onClick={handleShare}>
            <span className="font-sinhala">බෙදාගන්න | Share</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisResult;
