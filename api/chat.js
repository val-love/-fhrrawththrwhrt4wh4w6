export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, model } = req.body;

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
      },
      body: JSON.stringify({
        model: model || "z-ai/glm4.7",
        messages,
        stream: true   // 🔥 REQUIRED FOR STREAMING
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({
        error: "NVIDIA API error",
        details: errText
      });
    }

    // 🔥 STREAM RESPONSE DIRECTLY TO CLIENT
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // forward raw stream to frontend
      res.write(chunk);
    }

    res.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Request failed",
      message: err.message
    });
  }
}
