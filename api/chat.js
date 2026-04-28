export default async function handler(req, res) {
  // 🌐 CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { messages = [], mode = "chat" } = req.body;

  // 🧠 System prompts
  const systemPrompts = {
    code: "You are a senior software engineer. Output ONLY clean, working code. No explanations.",
    websitee: "You are a website builder AI. Generate full HTML, CSS, JS websites. No explanations.",
    scratch: "You are Scratch Buddy. Output ONLY Scratch 3.0 block-style instructions.",
    chat: "You are a helpful chat assistant. Be friendly, short, and clear. Do not output code unless asked.",
    game: "You are a game developer. Output complete working game code. No explanations."
  };

  // 🤖 Model selection
  const modelMap = {
    code: "codestral-latest",
    websitee: "codestral-latest",
    game: "codestral-latest",
    chat: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    scratch: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"
  };

  const system = systemPrompts[mode] || systemPrompts.chat;
  const model = modelMap[mode] || modelMap.chat;

  try {
    const response = await fetch("https://api.llm7.io/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer XLT8sSZr9d4sSTCMXnSG0F0FiXiYAXaNYg+tjwcT0NPLKOWk0Gv3nlNAjqoIh31zUoHus9zPUnbojNOFHDqvZwc/NioggI6tRNPgw+tfj7rEM2MReL5WM3HS7PiNrE/2oog=", // replace if you get a real key
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

    // 📡 Stream response to client
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
