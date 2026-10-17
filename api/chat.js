
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST." });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Server API key is not configured yet."
    });
  }

  try {
    const { message, history } = req.body || {};

    if (typeof message !== "string" || message.length > 8000) {
      return res.status(400).json({
        error: "Enter a message under 8,000 characters."
      });
    }

    const messages = [
      {
        role: "system",
        content:
          "You are MAG 3 PRO, a friendly, helpful AI assistant. " +
          "Answer clearly, naturally, and conversationally."
      }
    ];

    if (Array.isArray(history)) {
      for (const item of history.slice(-10)) {
        if (
          item &&
          ["user", "assistant"].includes(item.role) &&
          typeof item.content === "string" &&
          item.content.length <= 8000
        ) {
          messages.push({
            role: item.role,
            content: item.content
          });
        }
      }
    }

    messages.push({ role: "user", content: message });

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages,
          max_tokens: 1000,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", response.status);
      return res.status(502).json({
        error: "The AI provider request failed. Check your API key, model access, and credits."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string") {
      return res.status(502).json({
        error: "The AI returned no text response."
      });
    }

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Chat backend error:", error.message);
    return res.status(500).json({
      error: "An unexpected server error occurred."
    });
  }
}
