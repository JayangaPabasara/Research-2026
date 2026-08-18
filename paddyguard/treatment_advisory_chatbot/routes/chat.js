/** Chat route: /chat */
const express = require("express");
const router = express.Router();
const { handleChatMessage } = require("../services/chatService");

router.post("/chat", async (req, res) => {
  const { message, session_id } = req.body;

  if (!message || !session_id) {
    return res.status(400).json({ detail: "message and session_id are required" });
  }

  try {
    const result = await handleChatMessage(message, session_id);
    res.json(result);
  } catch (err) {
    console.error("[chat] Error:", err.message);
    res.status(500).json({ detail: err.message });
  }
});

module.exports = router;
