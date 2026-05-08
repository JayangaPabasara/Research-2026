/**
 * PaddyGuard AI — Main App
 * Orchestrates: VoiceRecorder → API call → DiagnosisResult
 */

import React, { useState, useCallback } from "react";
import VoiceRecorder from "./components/VoiceRecorder";
import DiagnosisResult from "./components/DiagnosisResult";
import { diagnose } from "./services/api";

// App states — clear state machine
const STATE = {
  IDLE: "idle",
  ANALYSING: "analysing",
  RESULT: "result",
  ERROR: "error",
};

export default function App() {
  const [appState, setAppState] = useState(STATE.IDLE);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAudioReady = useCallback(async (audioBlob) => {
    setAppState(STATE.ANALYSING);
    setError(null);
    setResult(null);

    try {
      const data = await diagnose(audioBlob);
      setResult(data);
      setAppState(STATE.RESULT);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Unknown error";
      setError(msg);
      setAppState(STATE.ERROR);
    }
  }, []);

  const handleReset = useCallback(() => {
    setAppState(STATE.IDLE);
    setResult(null);
    setError(null);
  }, []);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🌾</span>
            <div className="logo-text">
              <span className="logo-name">PaddyGuard AI</span>
              <span className="logo-tagline">ගොයම් රෝග හඳුනාගැනීම</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        {/* IDLE — show recorder */}
        {(appState === STATE.IDLE || appState === STATE.ANALYSING) && (
          <VoiceRecorder
            onAudioReady={handleAudioReady}
            isAnalysing={appState === STATE.ANALYSING}
          />
        )}

        {/* RESULT — show diagnosis */}
        {appState === STATE.RESULT &&
          result &&
          (result.is_ood ? (
            // OOD result screen
            <div
              className="error-card"
              style={{ borderColor: "#f97316", background: "#fff7ed" }}
            >
              <span className="error-icon">🚫</span>
              <h3 className="error-title" style={{ color: "#ea580c" }}>
                Not a disease symptom
              </h3>
              <p
                style={{
                  fontSize: ".9rem",
                  color: "#64748b",
                  textAlign: "center",
                }}
              >
                {result.message ||
                  "Please describe the symptoms of your paddy plant."}
              </p>
              <div
                style={{
                  background: "#f1f5f9",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  width: "100%",
                }}
              >
                <p
                  style={{
                    fontSize: ".8rem",
                    color: "#64748b",
                    marginBottom: "4px",
                  }}
                >
                  What you said:
                </p>
                <p
                  style={{
                    fontSize: ".9rem",
                    fontFamily: "Noto Sans Sinhala, sans-serif",
                  }}
                >
                  {result.sinhala_text}
                </p>
                <p style={{ fontSize: ".85rem", color: "#475569" }}>
                  "{result.english_text}"
                </p>
              </div>
              <p
                style={{
                  fontSize: ".8rem",
                  color: "#94a3b8",
                  textAlign: "center",
                }}
              >
                Example: "ගොයම් කොළ කහ වෙනවා" or "leaf edges turning yellow"
              </p>
              <button className="btn-secondary" onClick={handleReset}>
                🎙 Try again
              </button>
            </div>
          ) : (
            <DiagnosisResult result={result} onReset={handleReset} />
          ))}

        {/* ERROR — show error */}
        {appState === STATE.ERROR && (
          <div className="error-card">
            <span className="error-icon">⚠️</span>
            <h3 className="error-title">Something went wrong</h3>
            <p className="error-msg">{error}</p>
            <div className="error-tips">
              <p>Common fixes:</p>
              <ul>
                <li>Make sure the backend is running on port 8000</li>
                <li>Check your internet connection (needed for translation)</li>
                <li>Speak clearly and try again</li>
              </ul>
            </div>
            <button className="btn-secondary" onClick={handleReset}>
              🔄 Try Again
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>PaddyGuard AI · Component 1 · Voice Disease Diagnosis</p>
        <p>Research Project · SLIIT 2026</p>
      </footer>
    </div>
  );
}
