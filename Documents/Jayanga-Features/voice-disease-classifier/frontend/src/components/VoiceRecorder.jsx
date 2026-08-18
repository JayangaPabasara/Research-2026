/**
 * PaddyGuard AI — VoiceRecorder component
 * Handles microphone recording and audio file upload.
 */

import React, { useRef } from 'react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function VoiceRecorder({ onAudioReady, isAnalysing }) {
  const fileInputRef = useRef(null)
  const {
    isRecording, audioBlob, audioURL,
    duration, error,
    startRecording, stopRecording, reset
  } = useAudioRecorder()

  const handleStopAndReady = () => {
    stopRecording()
    // audioBlob is set async — wait for it via useEffect in parent
  }

  // When recording stops, audioBlob becomes available
  // Pass it up automatically
  React.useEffect(() => {
    if (audioBlob && !isRecording) {
      onAudioReady(audioBlob)
    }
  }, [audioBlob, isRecording])

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    onAudioReady(file)
    e.target.value = ''  // reset input
  }

  const handleReset = () => {
    reset()
  }

  if (isAnalysing) {
    return (
      <div className="analysing-state">
        <div className="spinner" />
        <p className="analysing-text">විශ්ලේෂණය කරමින්...</p>
        <p className="analysing-sub">Analysing your voice</p>
        <p className="analysing-hint">This may take 10–30 seconds</p>
      </div>
    )
  }

  return (
    <div className="recorder-container">

      {/* Instructions */}
      <div className="instructions">
        <p className="instructions-si si-text">
          ගොයම් රෝගයේ ලක්ෂණ ගැන කතා කරන්න
        </p>
        <p className="instructions-en">
          Describe your paddy disease symptoms in Sinhala
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      {/* Main record button */}
      {!audioBlob ? (
        <div className="record-section">
          <button
            className={`btn-record ${isRecording ? 'btn-record--active' : ''}`}
            onClick={isRecording ? handleStopAndReady : startRecording}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? (
              <>
                <span className="pulse-ring" />
                <span className="record-icon">⏹</span>
              </>
            ) : (
              <span className="record-icon">🎙</span>
            )}
          </button>

          {isRecording ? (
            <div className="recording-indicator">
              <span className="rec-dot" />
              <span className="rec-label">Recording — {formatDuration(duration)}</span>
            </div>
          ) : (
            <p className="tap-hint">Tap to start recording</p>
          )}

          {/* Divider */}
          {!isRecording && (
            <div className="divider">
              <span className="divider-text">or upload a file</span>
            </div>
          )}

          {/* File upload */}
          {!isRecording && (
            <>
              <button
                className="btn-upload"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 Upload audio file
              </button>
              <p className="upload-hint">
                Supports .ogg, .mp3, .wav, .flac, .m4a
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </>
          )}
        </div>
      ) : (
        /* Audio preview after recording */
        <div className="preview-section">
          <p className="preview-label">Recording ready ({formatDuration(duration)})</p>
          <audio
            src={audioURL}
            controls
            className="audio-player"
          />
          <button className="btn-reset" onClick={handleReset}>
            🔄 Record again
          </button>
        </div>
      )}
    </div>
  )
}
