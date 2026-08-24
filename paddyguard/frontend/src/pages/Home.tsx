import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Wheat, Mic, Leaf, Bug, MessageCircle, ChevronRight } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useDiagnosisStore } from "../store/diagnosisStore";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { getDiseaseColor, getDiseaseNameSi } from "../lib/disease";

const METHODS = [
  {
    key: "voice",
    to: "/voice",
    icon: Mic,
    iconBg: "bg-amber",
    title: "හඬ රෝග නිර්ණය",
    subtitle: "සිංහලෙන් ලක්ෂණ විස්තර කරන්න",
    featured: true,
  },
  {
    key: "leaf",
    to: "/leaf",
    icon: Leaf,
    iconBg: "bg-green-soft",
    title: "කොළ රෝග හඳුනාගැනීම",
    subtitle: "කොළ ඡායාරූපයක් ඇතුළු කරන්න",
  },
  {
    key: "pest",
    to: "/pest",
    icon: Bug,
    iconBg: "bg-amber-dark",
    title: "කෘමි හඳුනාගැනීම",
    subtitle: "කෘමිය ඡායාරූපයෙන් හඳුනාගන්න",
  },
  {
    key: "chat",
    to: "/treatment",
    icon: MessageCircle,
    iconBg: "bg-forest",
    title: "ප්‍රතිකාර උපදෙස්",
    subtitle: "AI රෝග විශේෂඥ විමසන්න",
  },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const voiceResult = useDiagnosisStore((s) => s.voiceResult);

  return (
    <div className="flex flex-col">
      <div className="bg-forest px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-sinhala text-lg font-bold text-white">
              ආයුබෝවන්, {user?.full_name || "ගොවියා"}!
            </h1>
            <p className="font-sinhala mt-1 text-[13px] text-white/70">
              ඔබේ ගොයමේ රෝග හඳුනා ගැනීමට අදාළ ක්‍රමය තෝරන්න
            </p>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10"
          >
            <Bell size={18} className="text-white" />
          </button>
        </div>
      </div>

      <div
        className="card-hover mx-4 mt-4 flex items-center justify-between rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, #F4991A 0%, #D4820E 100%)",
        }}
      >
        <div>
          <p className="text-xl font-bold text-white">PaddyGuard AI</p>
          <p className="font-sinhala mt-1 text-[13px] text-white/90">
            AI හඬ රෝග නිර්ණය
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Voice AI", "Image AI", "Chatbot"].map((label) => (
              <span
                key={label}
                className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-medium text-white"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <Wheat size={48} className="shrink-0 text-white opacity-40" />
      </div>

      <p className="mx-4 mt-6 text-xs font-semibold uppercase tracking-wide text-forest">
        ඔබේ ඉල්ලීම තෝරන්න
      </p>

      <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
        {METHODS.map(({ key, to, icon: Icon, iconBg, title, subtitle, featured }) => (
          <button
            key={key}
            type="button"
            onClick={() => navigate(to)}
            className={`card-hover flex flex-col items-start rounded-2xl bg-white p-4 text-left shadow-card transition-all duration-200 active:scale-[0.96] ${
              featured ? "border-2 border-amber" : ""
            }`}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}
            >
              <Icon size={22} className="text-white" />
            </div>
            <p className="font-sinhala mt-3 text-[15px] font-bold text-forest">
              {title}
            </p>
            <p className="font-sinhala mt-1 text-xs text-gray-muted">{subtitle}</p>
            <ChevronRight size={18} className="mt-2 text-amber" />
          </button>
        ))}
      </div>

      {voiceResult && (
        <>
          <p className="mx-4 mt-6 text-xs font-semibold uppercase tracking-wide text-gray-muted">
            අවසාන රෝග නිර්ණය
          </p>
          <Card
            className="mx-4 mt-3"
            style={{ borderLeft: `4px solid ${getDiseaseColor(voiceResult.disease)}` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-forest">{voiceResult.disease}</p>
                <p className="font-sinhala text-xs text-gray-muted">
                  {getDiseaseNameSi(voiceResult.disease)} ·{" "}
                  {Math.round(voiceResult.confidence * 100)}%
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/voice")}>
                <span className="font-sinhala">නැවත බලන්න</span>
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Home;
