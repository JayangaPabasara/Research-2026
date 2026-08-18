/**
 * Retrieval module — keyword-overlap retrieval over the static
 * treatment knowledge base (data/treatment_knowledge_base.json).
 */
const knowledgeBase = require("../data/treatment_knowledge_base.json");

function scoreEntry(query, entry) {
  const text = query.toLowerCase();
  let score = 0;
  for (const keyword of entry.keywords) {
    if (text.includes(keyword.toLowerCase())) score += 1;
  }
  return score;
}

/** Retrieve the best-matching knowledge base entry for a query, or null. */
function retrieve(query) {
  let best = null;
  let bestScore = 0;

  for (const entry of knowledgeBase) {
    const score = scoreEntry(query, entry);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return bestScore > 0 ? best : null;
}

module.exports = { retrieve };
