import { createOpenAI } from "@ai-sdk/openai";
import { groq } from "@ai-sdk/groq";
import { google } from "@ai-sdk/google";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

/** AI provider: "openai" | "groq" | "gemini". Default: openai. */
const AI_PROVIDER = (process.env.AI_PROVIDER ?? "openai") as "openai" | "groq" | "gemini";

export function getModel(): ReturnType<typeof groq> {
  if (AI_PROVIDER === "groq") {
    return groq(process.env.GROQ_MODEL ?? "llama-3.1-8b-instant");
  }
  if (AI_PROVIDER === "gemini") {
    return google(process.env.GEMINI_MODEL ?? "gemini-2.5-flash") as unknown as ReturnType<typeof groq>;
  }
  return openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini") as unknown as ReturnType<typeof groq>;
}
