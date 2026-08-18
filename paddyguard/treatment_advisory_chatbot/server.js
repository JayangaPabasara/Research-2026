/**
 * PaddyGuard AI — C4 Treatment Advisory Chatbot
 * Owner: Keshan Fernando (IT22303820)
 * Handles: RAG-based treatment recommendations for diagnosed diseases/pests
 */
require("dotenv").config();
const express = require("express");
const cors = require("express").json ? require("cors") : null;

const chatRoutes = require("./routes/chat");

const app = express();
const PORT = process.env.PORT || 8004;

app.use(cors({ origin: (process.env.ALLOWED_ORIGINS || "*").split(",") }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "treatment_advisory_chatbot", component: "C4" });
});

app.get("/", (req, res) => {
  res.json({ message: "PaddyGuard AI Treatment Advisory Chatbot is running" });
});

app.use("/", chatRoutes);

app.listen(PORT, () => {
  console.log(`[treatment_advisory_chatbot] C4 service started on port ${PORT}`);
});

module.exports = app;
