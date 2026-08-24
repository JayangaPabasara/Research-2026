import React from "react";
import { Mic, Square } from "lucide-react";
import Button from "./ui/Button";

interface VoiceRecorderProps {
  isRecording: boolean;
  duration: number;
  onStart: () => void;
  onStop: () => void;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const WAVE_HEIGHTS = [40, 65, 30, 80, 50, 90, 35, 60, 45, 75, 55, 85, 30, 65, 40, 70, 50, 90, 35, 60];

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isRecording,
  duration,
  onStart,
  onStop,
}) => {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center" style={{ height: 160, width: 160 }}>
        {isRecording && (
          <span
            className="absolute animate-recording-ring rounded-full border-2 border-red-soft/40"
            style={{ height: 160, width: 160 }}
          />
        )}
        <button
          type="button"
          onClick={isRecording ? onStop : onStart}
          className={`relative z-10 flex items-center justify-center rounded-full transition-all duration-200 active:scale-[0.96] ${
            isRecording
              ? "border-[3px] border-red-soft bg-red-soft/5"
              : "border-[3px] border-forest bg-white"
          }`}
          style={{
            height: 120,
            width: 120,
            boxShadow: "0 8px 32px rgba(52,79,31,0.18)",
          }}
        >
          {isRecording ? (
            <Square size={36} className="text-red-soft" fill="currentColor" />
          ) : (
            <Mic size={44} className="text-forest" />
          )}
        </button>
      </div>

      {isRecording ? (
        <div className="mt-3 flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-soft" />
          <span className="font-sinhala text-sm text-forest">
            {formatDuration(duration)} · පටිගත වෙමින් | Recording
          </span>
        </div>
      ) : (
        <p className="mt-3 font-sinhala text-[13px] text-gray-muted">
          ස්පර්ශ කරන්න | Tap to record
        </p>
      )}

      {isRecording && (
        <>
          <div className="mt-4 flex h-12 w-[90%] items-center justify-center gap-[3px] rounded-xl bg-beige px-3">
            {WAVE_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="w-[3px] animate-wave-bar rounded-full bg-amber"
                style={{
                  height: `${h}%`,
                  animationDelay: `${i * 0.06}s`,
                }}
              />
            ))}
          </div>

          <div className="mt-4 w-[90%]">
            <Button variant="primary" fullWidth onClick={onStop}>
              <span className="font-sinhala">
                නතර කර විශ්ලේෂණය කරන්න | Stop & Analyse
              </span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default VoiceRecorder;
