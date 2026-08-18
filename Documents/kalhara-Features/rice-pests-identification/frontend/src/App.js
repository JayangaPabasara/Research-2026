import React, { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult("");
    setError("");
  };

  const handleUpload = async () => {
    if (!file) {
      setError("⚠️ Please select an image first");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/predict/",
        formData
      );

      setResult(res.data.prediction);
      setConfidence(res.data.confidence);
    } catch (err) {
      setError("❌ Server error. Try again.");
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1 className="title">🌾 Rice Pest Detection</h1>

      <div className="card">

        {/* 📁 Upload */}
        <div className="upload-container">
          <label className="upload-label">
            📁 Choose Image
            <input type="file" onChange={handleFile} hidden />
          </label>

          {file && <p className="file-name">{file.name}</p>}
        </div>

        {/* 🖼 Preview */}
        {preview && (
          <img src={preview} alt="preview" className="image" />
        )}

        {/* 🚀 Button */}
        <button
          onClick={handleUpload}
          className="btn"
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Detect Pest"}
        </button>

        {/* ❗ Error */}
        {error && <p className="error">{error}</p>}
      </div>

      {/* 📊 Result */}
      {result && (
        <div className="result-card">

          {/* 🔥 UNKNOWN HANDLING */}
          {result === "Unknown Pest" ? (
            <h2 style={{ color: "red" }}>
              ⚠️ Not a valid rice pest image
            </h2>
          ) : (
            <h2>🌿 Result: {result}</h2>
          )}

          {/* 📊 Progress */}
          <div className="progress-bar">
            <div
              className="progress"
              style={{ width: `${confidence * 100}%` }}
            ></div>
          </div>

          <p>{(confidence * 100).toFixed(2)}% Confidence</p>
        </div>
      )}
    </div>
  );
}

export default App;