export default async function handler(req, res) {
  // 🌐 CORS HEADERS (IMPORTANT)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { messages, mode } = req.body;

  const systemPrompts = {
    code: "You are a senior software engineer. Output ONLY clean, working code. No explanations.",
    websitee: "You are a website builder AI. Generate full HTML, CSS, JS websites. No explanations.",
    scratch: "You are Scratch Buddy. Output ONLY Scratch 3.0 block-style instructions.",
    chat: "You are a helpful chat assistant. Be friendly, short, and clear. Do not output code unless asked.",
    game: "You are a game developer. Output complete working game code. No explanations."
  };

  const system = systemPrompts[mode] || systemPrompts.code;

  try {
    const response = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "z-ai/glm-5.1",
          messages: [
            { role: "system", content: system },
            ...messages
          ],
          temperature: 0.7,
          top_p: 1,
          max_tokens: 200000,
          stream: true
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: err });
    }

    // STREAM RESPONSE
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }

    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
