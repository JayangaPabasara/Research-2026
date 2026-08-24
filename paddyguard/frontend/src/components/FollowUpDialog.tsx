import React, { useState } from "react";
import { AlertTriangle, Mic } from "lucide-react";

interface FollowUpDialogProps {
  question: string;
  questionEn: string | null;
  questionNumber: number;
  maxQuestions: number;
  confidence: number;
  disease: string;
  isRecording: boolean;
  onStartVoiceAnswer: () => void;
  onStopVoiceAnswer: () => void;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
}

const FollowUpDialog: React.FC<FollowUpDialogProps> = ({
  question,
  questionEn,
  questionNumber,
  maxQuestions,
  confidence,
  disease,
  isRecording,
  onStartVoiceAnswer,
  onStopVoiceAnswer,
  onAnswer,
  onSkip,
}) => {
  const [dots] = useState(() => Array.from({ length: Math.max(maxQuestions, 3) }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-forest/30 backdrop-blur-sm">
      <div className="animate-slide-up mx-auto w-full max-w-[430px] rounded-t-3xl bg-white pb-4 shadow-2xl">
        <div className="flex justify-center pt-3">
          <span className="h-1 w-10 rounded-full bg-beige" />
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {dots.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i < questionNumber ? "h-[10px] w-[10px] bg-amber" : "h-2 w-2 bg-beige"
              }`}
            />
          ))}
        </div>

        {confidence < 0.6 && (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-xl border border-amber bg-amber-light p-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-dark" />
            <div>
              <p className="font-sinhala text-sm font-semibold text-forest">
                අඩු විශ්වාසදායීතාවය — {Math.round(confidence * 100)}%
              </p>
              <p className="font-sinhala text-xs text-gray-muted">
                ආරම්භක රෝග නිර්ණය: {disease}
              </p>
            </div>
          </div>
        )}

        <div className="mx-4 mt-4 rounded-2xl bg-white p-5 shadow-card">
          <p className="text-center text-xs text-gray-muted">
            ප්‍රශ්නය {questionNumber} / {maxQuestions}
          </p>
          <div className="mx-auto mb-4 mt-2 h-[3px] w-10 rounded-full bg-amber" />
          <p className="font-sinhala text-center text-lg font-semibold leading-relaxed text-forest">
            {question}
          </p>
          {questionEn && (
            <p className="mt-2 text-center text-[13px] italic text-gray-muted">
              {questionEn}
            </p>
          )}
        </div>

        <p className="font-sinhala mt-4 text-center text-[13px] text-gray-muted">
          ස්පර්ශ කර පිළිතුරු දෙන්න | Tap to answer
        </p>

        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={isRecording ? onStopVoiceAnswer : onStartVoiceAnswer}
            className={`flex h-20 w-20 items-center justify-center rounded-full border-[2.5px] bg-white transition-all duration-200 active:scale-[0.96] ${
              isRecording ? "animate-pulse-mic border-red-soft" : "border-forest"
            }`}
          >
            <Mic size={32} className={isRecording ? "text-red-soft" : "text-forest"} />
          </button>
        </div>

        <div className="mx-4 mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => onAnswer("ඔව්")}
            className="h-12 w-1/2 rounded-xl bg-amber text-base font-bold text-white transition-all duration-200 active:scale-[0.96]"
          >
            <span className="font-sinhala">ඔව් | Yes</span>
          </button>
          <button
            type="button"
            onClick={() => onAnswer("නෑ")}
            className="h-12 w-1/2 rounded-xl border border-forest bg-white text-base font-bold text-forest transition-all duration-200 active:scale-[0.96]"
          >
            <span className="font-sinhala">නෑ | No</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="font-sinhala mx-auto mb-1 mt-3 block text-[13px] text-gray-muted underline"
        >
          මෙම ප්‍රශ්නය මඟ හරින්න | Skip
        </button>
      </div>
    </div>
  );
};

export default FollowUpDialog;
