/**
 * PaddyGuard AI — DiagnosisResult component
 * Displays the disease classification result clearly.
 */

import React from 'react'

// Disease display info — name in Sinhala + colour + treatment hint
const DISEASE_INFO = {
  'Bacterial Blight': {
    si:      'බැක්ටීරියා අංගමාරය',
    color:   '#dc2626',
    bg:      '#fef2f2',
    border:  '#fca5a5',
    icon:    '🟡',
    hint:    'Yellowing leaf margins, white stripe from tip. Check for bacterial ooze on cut stem.',
    hintSi:  'කොළ ආන්තරේ කහ/ශ්වේත. කද කපලා ශ්‍රාවය බලන්න.',
  },
  'Leaf Blast': {
    si:      'කොළ පාළුව',
    color:   '#d97706',
    bg:      '#fffbeb',
    border:  '#fcd34d',
    icon:    '💎',
    hint:    'Diamond-shaped grey spots with brown border. Common in BG-307 variety.',
    hintSi:  'ඩයිමන්ඩ් හැඩ අළු ලකුණු. BG-307 ප්‍රබේදයට සාමාන්‍ය.',
  },
  'Brown Spot': {
    si:      'දුඹුරු පුල්ලි රෝගය',
    color:   '#92400e',
    bg:      '#fef3c7',
    border:  '#f59e0b',
    icon:    '🟤',
    hint:    'Many small brown/black dots scattered densely on leaves.',
    hintSi:  'කොළ ගාව පොඩි දුඹුරු/කලු ඩොට් ගොඩාක්.',
  },
  'Healthy': {
    si:      'සෞඛ්‍ය සම්පන්නයි',
    color:   '#16a34a',
    bg:      '#f0fdf4',
    border:  '#86efac',
    icon:    '✅',
    hint:    'No disease detected. Your paddy looks healthy!',
    hintSi:  'රෝගයක් නොමැත. ගොයම් සෞඛ්‍ය සම්පන්නයි!',
  }
}

function ConfidenceBar({ score, label, color, isTop }) {
  return (
    <div className="score-row">
      <span className="score-label">{label}</span>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{
            width:           `${score * 100}%`,
            background:      isTop ? color : '#94a3b8',
            opacity:         isTop ? 1 : 0.4,
          }}
        />
      </div>
      <span className="score-pct">{(score * 100).toFixed(1)}%</span>
    </div>
  )
}

export default function DiagnosisResult({ result, onReset }) {
  if (!result) return null

  const info          = DISEASE_INFO[result.disease] || DISEASE_INFO['Healthy']
  const confPct       = (result.confidence * 100).toFixed(1)
  const isHighConf    = !result.needs_followup

  return (
    <div className="result-card" style={{ borderColor: info.border, background: info.bg }}>

      {/* Disease Name */}
      <div className="result-header">
        <span className="result-icon">{info.icon}</span>
        <div>
          <h2 className="result-disease" style={{ color: info.color }}>
            {result.disease}
          </h2>
          <p className="result-disease-si">{info.si}</p>
        </div>
      </div>

      {/* Confidence badge */}
      <div className={`conf-badge ${isHighConf ? 'conf-high' : 'conf-low'}`}>
        {isHighConf
          ? `✅ Confident — ${confPct}%`
          : `⚠️ Low confidence — ${confPct}% — Follow-up recommended`
        }
      </div>

      {/* Transcript */}
      <div className="transcript-box">
        <div className="transcript-row">
          <span className="transcript-label">🗣 Sinhala</span>
          <span className="transcript-text si-text">{result.sinhala_text}</span>
        </div>
        <div className="transcript-row">
          <span className="transcript-label">🔤 English</span>
          <span className="transcript-text">{result.english_text}</span>
        </div>
      </div>

      {/* Symptom hint */}
      <div className="hint-box">
        <p className="hint-en">{info.hint}</p>
        <p className="hint-si si-text">{info.hintSi}</p>
      </div>

      {/* All scores */}
      <div className="scores-section">
        <p className="scores-title">Model confidence scores</p>
        {Object.entries(result.all_scores)
          .sort((a, b) => b[1] - a[1])
          .map(([label, score]) => (
            <ConfidenceBar
              key={label}
              label={label}
              score={score}
              color={info.color}
              isTop={label === result.disease}
            />
          ))
        }
      </div>

      {/* Processing time */}
      <p className="processing-time">
        Processed in {result.processing_ms}ms
      </p>

      {/* Try again */}
      <button className="btn-secondary" onClick={onReset}>
        🎙 Try another recording
      </button>
    </div>
  )
}
