import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Info,
  Mic,
  UploadCloud,
  CheckCircle,
  Loader2,
  Circle,
} from "lucide-react";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useDiagnosis } from "../hooks/useDiagnosis";
import VoiceRecorder from "../components/VoiceRecorder";
import DiagnosisResult from "../components/DiagnosisResult";
import FollowUpDialog from "../components/FollowUpDialog";
import OODWarning from "../components/OODWarning";

type Phase = "idle" | "recording" | "analysing" | "result";

const EXAMPLES = [
  "ගොයම් කොළ ආන්තරේ කහ පාට රේඛා",
  "කොළ ගාව පොඩි දුඹුරු ලප ගොඩාක්",
  "ඩයිමන්ඩ් හැඩ අළු ලකුණු",
];

const STEP_LABELS = [
  "හඬ Sinhala text බවට | Transcribed",
  "ඉංග්‍රීසියට පරිවර්තනය | Translating...",
  "රෝගය වර්ගීකරණය | Classifying...",
];

// Minimal typing for the vendor-prefixed Web Speech API used for follow-up voice answers.
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

const getSpeechRecognition = (): (new () => SpeechRecognitionLike) | null => {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

const VoiceDiagnosis: React.FC = () => {
  const navigate = useNavigate();
  const {
    isRecording,
    audioBlob,
    duration,
    error: recorderError,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();
  const { diagnose, followup, isLoading, result, followupState, clearResult } =
    useDiagnosis();

  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [followupRecording, setFollowupRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (recorderError) {
      toast.error("මයික්‍රෆෝන අවසර අවශ්‍යයි | Microphone permission required");
      setPhase("idle");
    }
  }, [recorderError]);

  // Once a recording (or upload) finishes, kick off the diagnosis request.
  useEffect(() => {
    if (audioBlob && phase !== "analysing") {
      setPhase("analysing");
      setStep(0);
      diagnose(audioBlob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  useEffect(() => {
    if (phase === "analysing") {
      const t1 = setTimeout(() => setStep(1), 600);
      const t2 = setTimeout(() => setStep(2), 1400);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [phase]);

  useEffect(() => {
    if (!isLoading && result && phase === "analysing") {
      setPhase("result");
    }
  }, [isLoading, result, phase]);

  const handleStart = useCallback(() => {
    clearResult();
    startRecording();
    setPhase("recording");
  }, [clearResult, startRecording]);

  const handleStop = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleRetry = useCallback(() => {
    clearRecording();
    clearResult();
    setPhase("idle");
  }, [clearRecording, clearResult]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { "audio/*": [] },
    multiple: false,
    onDrop: (accepted) => {
      const file = accepted[0];
      if (!file) return;
      clearResult();
      setPhase("analysing");
      setStep(0);
      diagnose(file);
    },
  });

  const startFollowupVoiceAnswer = () => {
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) {
      toast("හඬ පිළිතුරු සහාය නොදක්වයි — Yes/No භාවිතා කරන්න", { icon: "ℹ️" });
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "si-LK";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) followup(transcript);
    };
    recognition.onerror = () => {
      toast.error("හඬ හඳුනාගැනීම අසාර්ථකයි | Voice recognition failed");
    };
    recognition.onend = () => setFollowupRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setFollowupRecording(true);
  };

  const stopFollowupVoiceAnswer = () => {
    recognitionRef.current?.stop();
    setFollowupRecording(false);
  };

  const handleFollowupAnswer = (answer: string) => {
    followup(answer);
  };

  const handleFollowupSkip = () => {
    followup("");
  };

  useEffect(() => {
    if (followupState.active) setPhase("result");
  }, [followupState.active]);

  return (
    <div className="relative min-h-screen">
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+16px)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-[0.96]"
        >
          <ArrowLeft size={20} className="text-forest" />
        </button>
        <h1 className="font-sinhala flex items-center gap-2 text-base font-bold text-forest">
          හඬ රෝග නිර්ණය
          {phase === "recording" && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-soft" />
          )}
        </h1>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 active:scale-[0.96]"
        >
          <Info size={18} className="text-forest" />
        </button>
      </div>

      {phase === "idle" && (
        <div className="animate-fade-in flex flex-col">
          <div className="mx-4 mt-4 flex gap-3 rounded-2xl border-l-4 border-forest bg-beige p-4">
            <Mic size={22} className="mt-0.5 shrink-0 text-amber" />
            <div>
              <p className="font-sinhala text-sm text-forest">
                ගොයම් රෝගයේ ලක්ෂණ ගැන සිංහලෙන් කතා කරන්න
              </p>
              <p className="mt-1 text-xs text-gray-muted">
                Describe your paddy disease symptoms in Sinhala
              </p>
            </div>
          </div>

          <div className="mt-12 flex justify-center">
            <VoiceRecorder
              isRecording={false}
              duration={0}
              onStart={handleStart}
              onStop={handleStop}
            />
          </div>

          <div className="mx-4 mt-8 flex items-center gap-3">
            <div className="h-px flex-1 bg-beige" />
            <span className="font-sinhala text-xs text-gray-muted">හෝ | or</span>
            <div className="h-px flex-1 bg-beige" />
          </div>

          <div
            {...getRootProps()}
            className="mx-4 mt-4 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-forest/20 bg-beige transition-all duration-200 active:scale-[0.96]"
          >
            <input {...getInputProps()} />
            <UploadCloud size={18} className="text-amber" />
            <span className="font-sinhala text-sm text-forest">
              ශ්‍රව්‍ය ගොනුවක් ඇතුළු කරන්න | Upload audio
            </span>
          </div>

          <div className="mx-4 mb-6 mt-6 rounded-2xl bg-white p-4 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber">
              උදාහරණ ලක්ෂණ | Example symptoms
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {EXAMPLES.map((ex) => (
                <div key={ex} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-soft" />
                  <span className="font-sinhala text-sm text-forest">{ex}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === "recording" && (
        <div className="animate-fade-in flex flex-col">
          <div className="mx-4 mt-4 min-h-16 rounded-2xl bg-beige p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-muted">
              සජීව පිටපත | Live transcript
            </p>
            <p className="font-sinhala mt-2 italic text-forest">
              සවන් දෙමින්...
              <span className="animate-pulse">▍</span>
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            <VoiceRecorder
              isRecording
              duration={duration}
              onStart={handleStart}
              onStop={handleStop}
            />
          </div>
        </div>
      )}

      {phase === "analysing" && (
        <div className="animate-fade-in flex flex-col items-center px-4 pt-16 opacity-95">
          <Loader2 size={64} className="animate-spin text-forest" strokeWidth={1.5} />
          <p className="font-sinhala mt-4 text-lg font-bold text-forest">
            විශ්ලේෂණය කරමින් | Analysing...
          </p>

          <div className="mt-6 flex w-full flex-col gap-3">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-3">
                {i < step ? (
                  <CheckCircle size={18} className="shrink-0 text-green-soft" />
                ) : i === step ? (
                  <Loader2 size={18} className="shrink-0 animate-spin text-amber" />
                ) : (
                  <Circle size={18} className="shrink-0 text-gray-muted" />
                )}
                <span className="font-sinhala text-sm text-forest">{label}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-gray-muted">
            තත්පර 10-30ක් ගතවිය හැකිය | May take 10-30 seconds
          </p>
        </div>
      )}

      {phase === "result" && result && !followupState.active && !result.is_ood && (
        <div className="mt-4">
          <DiagnosisResult result={result} onRetry={handleRetry} />
        </div>
      )}

      {phase === "result" && result && result.is_ood && (
        <div className="mt-10">
          <OODWarning
            message={result.message}
            reason={result.ood_reason}
            onRetry={handleRetry}
          />
        </div>
      )}

      {phase === "result" && followupState.active && followupState.question && (
        <FollowUpDialog
          question={followupState.question}
          questionEn={followupState.questionEn}
          questionNumber={followupState.questionNumber}
          maxQuestions={followupState.maxQuestions}
          confidence={result?.confidence ?? 0}
          disease={result?.disease ?? ""}
          isRecording={followupRecording}
          onStartVoiceAnswer={startFollowupVoiceAnswer}
          onStopVoiceAnswer={stopFollowupVoiceAnswer}
          onAnswer={handleFollowupAnswer}
          onSkip={handleFollowupSkip}
        />
      )}
    </div>
  );
};

export default VoiceDiagnosis;
