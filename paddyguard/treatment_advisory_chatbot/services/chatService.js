/** Orchestrates retrieval + generation for a chat message. */
const { retrieve } = require("../rag/retriever");
const { generateResponse } = require("../rag/generator");

// In-memory session history (swap for Mongo-backed storage in production)
const sessions = new Map();

async function handleChatMessage(message, sessionId) {
  const history = sessions.get(sessionId) || [];
  history.push({ role: "user", message });

  const entry = retrieve(message);
  const result = await generateResponse(message, entry);

  history.push({ role: "assistant", message: result.recommendation });
  sessions.set(sessionId, history);

  return result;
}

module.exports = { handleChatMessage };
