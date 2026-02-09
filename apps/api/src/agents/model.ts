import { createOpenAI } from "@ai-sdk/openai";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

export function getModel() {
  return openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini");
}
