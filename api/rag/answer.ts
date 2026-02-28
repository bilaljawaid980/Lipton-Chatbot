import { z } from "zod";

import { answerQuestion } from "./_engine";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

const answerSchema = z.object({
  question: z.string().min(3),
  topK: z.number().min(1).max(8).default(4),
});

export default async function handler(request: any, response: any) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const parsed = answerSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const { question, topK } = parsed.data;

  try {
    const payload = await answerQuestion(question, topK);
    response.status(200).json(payload);
  } catch (error) {
    console.error("answer error", error);
    response.status(500).json({ error: "Failed to generate answer" });
  }
}
