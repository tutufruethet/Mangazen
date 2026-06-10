export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta configurar GEMINI_API_KEY na Vercel." });
  }

  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Prompt vazio." });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: err?.error?.message || `Google HTTP ${r.status}` });
    }

    const data = await r.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const img = parts.find((p) => p.inlineData?.data);
    if (!img) return res.status(502).json({ error: "Google nao retornou imagem." });

    return res.status(200).json({
      image: `data:${img.inlineData.mimeType || "image/png"};base64,${img.inlineData.data}`,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
