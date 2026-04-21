export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // DEBUG (optional but helpful)
    console.log("NVIDIA RAW:", JSON.stringify(data, null, 2));

    // Extract correct fields (IMPORTANT FIX)
    const message =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.message?.reasoning_content ||
      data?.choices?.[0]?.message?.text ||
      "No response from model.";

    res.status(200).json({
      reply: message,
      raw: data
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Request failed" });
  }
}
