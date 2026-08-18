/**
 * Generation module — grounds the retrieved knowledge base entry
 * into a natural-language response using an LLM. Falls back to the
 * raw retrieved entry when no API key is configured or the call fails.
 */
const OpenAI = require("openai");

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function buildFallback(entry, query) {
  if (!entry) {
    return {
      recommendation:
        "I could not find a specific match for that description. Could you mention the disease or pest name, or describe the symptoms in more detail?",
      pesticide_dosage: "Not applicable.",
      preventive_measures: [],
      biological_control: [],
    };
  }
  return {
    recommendation: entry.recommendation,
    pesticide_dosage: entry.pesticide_dosage,
    preventive_measures: entry.preventive_measures,
    biological_control: entry.biological_control,
  };
}

async function generateResponse(query, entry) {
  const fallback = buildFallback(entry, query);

  if (!process.env.OPENAI_API_KEY || !entry) {
    return fallback;
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const context = JSON.stringify(entry, null, 2);

    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are PaddyGuard AI's treatment advisor for Sri Lankan rice farmers. " +
            "Use ONLY the provided context to answer. Keep the recommendation concise and actionable.",
        },
        {
          role: "user",
          content: `Farmer question: ${query}\n\nContext:\n${context}\n\nRespond as a short, farmer-friendly recommendation.`,
        },
      ],
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    return {
      ...fallback,
      recommendation: text || fallback.recommendation,
    };
  } catch (err) {
    console.error("[generator] LLM call failed, using fallback:", err.message);
    return fallback;
  }
}

module.exports = { generateResponse };
