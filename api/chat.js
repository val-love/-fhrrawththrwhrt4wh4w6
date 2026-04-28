export default async function handler(req, res) {
  // 🌐 CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { messages = [], mode = "chat" } = req.body;

  // 🧠 System prompts
  const systemPrompts = {
    code: "You are a senior software engineer. Output ONLY clean, working code. No explanations.",
    websitee: "You are a website builder AI. Generate full HTML, CSS, JS websites. No explanations.",
    scratch: "You are Scratch Buddy. Output ONLY Scratch 3.0 block-style instructions.",
    chat: "You are a helpful assistant. Be short, clear, and useful.",
    game: "You are a game developer. Output complete working game code. No explanations."
  };

  // 🤖 Model selection (GLM used for coding modes as requested)
  const modelMap = {
    code: "GLM-4.6V-Flash",
    websitee: "GLM-4.6V-Flash",
    game: "GLM-4.6V-Flash",

    chat: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    scratch: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"
  };

  const system = systemPrompts[mode] || systemPrompts.chat;
  const model = modelMap[mode] || modelMap.chat;

  try {
    const response = await fetch("https://api.llm7.io/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer unused",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          ...messages
        ],
        temperature: 0.7,
        stream: true
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: err });
    }

    // 📡 Streaming response
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const data = line.replace("data: ", "").trim();
        if (data === "[DONE]") {
          res.end();
          return;
        }

        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            res.write(content);
          }
        } catch (e) {
          // ignore bad chunks
        }
      }
    }

    res.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
