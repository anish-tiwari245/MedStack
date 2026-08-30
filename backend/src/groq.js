// Groq: replaces Gemini for both jobs.
// - extractLabel: reads a pill-bottle label from a photo (Llama 4 Scout, vision)
// - summarizeInteraction: rewrites scraped clinical text into plain English + severity (Llama 3.3)
// Groq is OpenAI-compatible, so we use the chat/completions endpoint.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b';
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-120b';

function requireKey() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error('GROQ_API_KEY is not set');
    err.code = 'NO_GROQ_KEY';
    throw err;
  }
  return apiKey;
}

async function groqChat(model, messages, apiKey) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Groq error ${res.status}: ${text}`);
    err.code = 'GROQ_ERROR';
    throw err;
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '{}';
}

const EXTRACTION_PROMPT = `You are reading a photo of a prescription or over-the-counter medication label.
Extract the medication information. Respond with ONLY a JSON object, no markdown, with this exact shape:
{
  "drug": "generic drug name in lowercase, single active ingredient (e.g. 'warfarin', 'ibuprofen'). If a brand name is shown, convert to the generic name.",
  "brand": "brand name if visible, else null",
  "dosage": "strength with units as printed (e.g. '5 mg', '200 mg'), else null",
  "frequency": "how often to take if printed (e.g. 'once daily', 'as needed'), else null",
  "confidence": "high | medium | low"
}
If the image is not a medication label, return {"drug": null, "confidence": "low"}.`;

/**
 * Read a pill-bottle label from a base64 image using Groq vision.
 */
export async function extractLabel(base64Image, mimeType = 'image/jpeg') {
  const apiKey = requireKey();
  const dataUrl = `data:${mimeType};base64,${base64Image}`;
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: EXTRACTION_PROMPT },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    },
  ];
  const raw = await groqChat(VISION_MODEL, messages, apiKey);
  return safeParse(raw);
}

/**
 * Translate raw scraped clinical interaction text into plain English + severity.
 */
export async function summarizeInteraction(drugA, drugB, clinicalText) {
  const apiKey = requireKey();
  const prompt = `You are a clinical pharmacist assistant. Below is raw text about a possible interaction between ${drugA} and ${drugB}, scraped from a drug-information website.

Rewrite it for a worried family caregiver with no medical training. Respond with ONLY a JSON object:
{
  "severity": "red | yellow | green",
  "summary": "one or two plain-English sentences describing the risk. No jargon.",
  "action": "one short sentence telling them what to do."
}
Severity guide: red = serious/dangerous, avoid or requires medical supervision; yellow = use caution, monitor; green = no significant interaction known.
If the text shows no meaningful interaction between THESE TWO specific drugs, return severity "green".

RAW TEXT:
${clinicalText.slice(0, 1500)}`;

  const messages = [{ role: 'user', content: prompt }];
  const raw = await groqChat(TEXT_MODEL, messages, apiKey);
  const parsed = safeParse(raw);
  return {
    severity: ['red', 'yellow', 'green'].includes(parsed.severity) ? parsed.severity : 'yellow',
    summary: parsed.summary || 'Interaction information could not be summarized.',
    action: parsed.action || 'Check with a doctor or pharmacist.',
  };
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const cleaned = String(raw).replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return {};
    }
  }
}
