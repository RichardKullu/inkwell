import Groq from "groq-sdk";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

interface AIRequest {
  action: "autocomplete" | "rewrite" | "shorten" | "lengthen" | "grammar" | "tone";
  text: string;
  context?: string;
  tone?: "formal" | "casual";
}

const SYSTEM_PROMPT = `You are a writing assistant embedded in a document editor. You help users write better by completing, rewriting, and refining their text. Be concise and match the user's writing style. Output ONLY the resulting text — no explanations, no markdown formatting, no quotes.`;

function buildPrompt(req: AIRequest): string {
  switch (req.action) {
    case "autocomplete":
      return `Continue writing naturally from where this text leaves off. Context:\n\n${req.context ?? ""}\n\nText to continue from:\n${req.text}`;
    case "rewrite":
      return `Rewrite this text to be clearer and more polished while preserving the meaning:\n\n${req.text}`;
    case "shorten":
      return `Make this text more concise while keeping the key points:\n\n${req.text}`;
    case "lengthen":
      return `Expand this text with more detail and depth:\n\n${req.text}`;
    case "grammar":
      return `Fix any grammar, spelling, and punctuation errors in this text:\n\n${req.text}`;
    case "tone":
      return `Rewrite this text in a ${req.tone ?? "formal"} tone:\n\n${req.text}`;
    default:
      return req.text;
  }
}

export function streamGrokResponse(req: AIRequest) {
  return client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(req) },
    ],
    stream: true,
    max_tokens: 1024,
  });
}
