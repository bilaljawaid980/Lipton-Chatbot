import "dotenv/config";
import { readFile } from "node:fs/promises";
import cors from "cors";
import express from "express";
import type { Request, Response } from "express";
import OpenAI from "openai";
import { z } from "zod";

import { CHUNKS_FILE, DARAZ_PRODUCTS_FILE, cosineSimilarity, lexicalScore, readJson } from "./lib.js";
import type { Chunk, DarazProduct, QueryResult } from "./types.js";

const app = express();
const port = Number(process.env.RAG_PORT ?? "8787");
const baseURL =
  process.env.RAG_OPENAI_BASE_URL ??
  process.env.OPENAI_BASE_URL ??
  process.env.VERCEL_AI_GATEWAY_BASE_URL ??
  "";
const isGateway = baseURL.includes("ai-gateway.vercel.sh");

const embeddingModel =
  process.env.RAG_EMBEDDING_MODEL ??
  (isGateway ? "openai/text-embedding-3-small" : "text-embedding-3-small");
const chatModel = process.env.RAG_CHAT_MODEL ?? (isGateway ? "openai/gpt-4o-mini" : "gpt-4o-mini");

const querySchema = z.object({
  question: z.string().min(3),
  topK: z.number().min(1).max(10).default(5),
});

const answerSchema = z.object({
  question: z.string().min(3),
  topK: z.number().min(1).max(8).default(4),
});

type ChunkPayload = {
  source: string;
  crawledAt: string;
  builtAt: string;
  chunkCount: number;
  embeddingModel: string | null;
  chunks: Chunk[];
};

type AnswerAction = {
  type: "open_url" | "mailto";
  label: string;
  url: string;
};

let chunkPayload: ChunkPayload;
let darazProducts: DarazProduct[] = [];
const complaintGmail = process.env.RAG_COMPLAINT_GMAIL ?? "";

const apiKey = process.env.VERCEL_AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY;

const openai = apiKey
  ? new OpenAI({ apiKey, baseURL: baseURL || undefined })
  : null;

const rankByVector = async (question: string, topK: number): Promise<QueryResult[]> => {
  if (!openai) {
    return [];
  }

  const vectorChunks = chunkPayload.chunks.filter((chunk) => Array.isArray(chunk.vector));
  if (vectorChunks.length === 0) {
    return [];
  }

  const embedding = await openai.embeddings.create({
    model: embeddingModel,
    input: question,
  });
  const queryVector = embedding.data[0].embedding;

  return vectorChunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryVector, chunk.vector as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
};

const rankLexical = (question: string, topK: number): QueryResult[] =>
  chunkPayload.chunks
    .map((chunk) => ({
      chunk,
      score: lexicalScore(question, `${chunk.title} ${chunk.text}`),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

const getMatches = async (question: string, topK: number) => {
  let results = await rankByVector(question, topK);
  let retrieval = "semantic";

  if (results.length === 0) {
    results = rankLexical(question, topK);
    retrieval = "lexical";
  }

  return { results, retrieval };
};

const buildContext = (results: QueryResult[]) =>
  results
    .map(
      (result, index) =>
        `Source ${index + 1}: ${result.chunk.title} (${result.chunk.url})\n${result.chunk.text}`,
    )
    .join("\n\n");

const buildFallbackAnswer = (results: QueryResult[]) => {
  if (results.length === 0) {
    return "I couldn’t find matching Lipton content for that question yet. Try rephrasing your question or run scraping again.";
  }

  const snippets = results
    .slice(0, 2)
    .map((result, index) => {
      const shortText = result.chunk.text.slice(0, 260).trim();
      return `${index + 1}. ${result.chunk.title}: ${shortText}${result.chunk.text.length > 260 ? "..." : ""}`;
    })
    .join("\n");

  return `Here is what I found on Lipton pages:\n${snippets}\n\nAdd VERCEL_AI_GATEWAY_API_KEY or OPENAI_API_KEY to enable fully generated answers.`;
};

const buildDarazSummary = () => {
  if (darazProducts.length === 0) {
    return "";
  }

  const top = darazProducts
    .slice(0, 3)
    .map((product, index) => `${index + 1}. ${product.title} — ${product.price}`)
    .join("\n");

  return `\n\nDaraz tea price options:\n${top}`;
};

const generateAnswer = async (question: string, context: string) => {
  if (!openai) {
    return null;
  }

  const completion = await openai.chat.completions.create({
    model: chatModel,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are a Lipton website assistant. Answer only from the provided context. If information is missing, say you are not sure and suggest checking Lipton pages.",
      },
      {
        role: "user",
        content: `Question: ${question}\n\nContext:\n${context}`,
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? null;
};

const isBuyIntent = (question: string) =>
  /\b(buy|purchase|order|shop|get one|where to buy)\b/i.test(question);

const isPriceIntent = (question: string) =>
  /\b(price|prices|cost|costs|rate|rates|how much|pricing)\b/i.test(question);

const isComplaintIntent = (question: string) =>
  /\b(complaint|complain|issue|problem|damaged|refund|bad|not good|quality|too sour|sour|too bitter|bitter|taste change|tastes weird|stale|expired|not fresh|too strong|too weak|doesn'?t taste right|does not taste right)\b/i.test(
    question,
  );

const getBestBuyUrl = (results: QueryResult[]) => {
  if (darazProducts.length > 0 && darazProducts[0].itemUrl) {
    return darazProducts[0].itemUrl;
  }

  const productMatch = results.find((result) => /\/our-teas\//i.test(result.chunk.url));
  if (productMatch) {
    return productMatch.chunk.url;
  }
  return results[0]?.chunk.url ?? "https://www.daraz.pk/catalog/?q=lipton%20tea";
};

const buildDarazPriceAnswer = () => {
  if (darazProducts.length === 0) {
    return "I couldn’t fetch Daraz prices yet. Please try again after running scrape:lipton.";
  }

  const topItems = darazProducts
    .slice(0, 5)
    .map((product, index) => `${index + 1}. ${product.title} — ${product.price}`)
    .join("\n");

  return `Here are current Lipton tea prices from Daraz:\n${topItems}\n\nClick \"Open Daraz tea page\" to buy.`;
};

const buildComplaintAnswer = () =>
  "I’m sorry you had this experience. I can help you file a complaint now — click ‘Send complaint email’ and it will open Gmail with your complaint pre-filled.";

const buildComplaintMailtoUrl = (question: string) => {
  if (!complaintGmail) {
    return null;
  }

  const subject = encodeURIComponent("Lipton chatbot complaint");
  const body = encodeURIComponent(`Complaint from chatbot user:\n\n${question}`);
  return `mailto:${complaintGmail}?subject=${subject}&body=${body}`;
};

const getActions = (question: string, results: QueryResult[]) => {
  const actions: AnswerAction[] = [];

  if (isBuyIntent(question) || isPriceIntent(question)) {
    actions.push({
      type: "open_url",
      label: "Open Daraz tea page",
      url: getBestBuyUrl(results),
    });
  }

  if (isComplaintIntent(question)) {
    const mailtoUrl = buildComplaintMailtoUrl(question);
    if (mailtoUrl) {
      actions.push({
        type: "mailto",
        label: "Send complaint email",
        url: mailtoUrl,
      });
    }
  }

  return actions;
};

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/rag/health", (_request: Request, response: Response) => {
  response.json({
    ok: true,
    chunkCount: chunkPayload?.chunkCount ?? 0,
    semanticEnabled:
      Boolean(openai) && chunkPayload?.chunks?.some((chunk) => Array.isArray(chunk.vector)),
  });
});

app.post("/api/rag/query", async (request: Request, response: Response) => {
  const parsed = querySchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const { question, topK } = parsed.data;

  try {
    const { results, retrieval } = await getMatches(question, topK);
    const context = buildContext(results);

    response.json({
      question,
      retrieval,
      matches: results.map((result) => ({
        id: result.chunk.id,
        url: result.chunk.url,
        title: result.chunk.title,
        score: Number(result.score.toFixed(5)),
        text: result.chunk.text,
      })),
      context,
    });
  } catch (error) {
    console.error("Query error", error);
    response.status(500).json({ error: "Failed to retrieve context" });
  }
});

app.post("/api/rag/answer", async (request: Request, response: Response) => {
  const parsed = answerSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const { question, topK } = parsed.data;

  try {
    const { results, retrieval } = await getMatches(question, topK);
    const context = buildContext(results);
    let answer = (await generateAnswer(question, context)) ?? buildFallbackAnswer(results);

    if (isPriceIntent(question) || isBuyIntent(question)) {
      answer = buildDarazPriceAnswer();
    }

    if (isComplaintIntent(question)) {
      answer = buildComplaintAnswer();
    }

    const actions = getActions(question, results);

    response.json({
      question,
      retrieval,
      answer,
      actions,
      matches: results.map((result) => ({
        id: result.chunk.id,
        url: result.chunk.url,
        title: result.chunk.title,
        score: Number(result.score.toFixed(5)),
      })),
    });
  } catch (error) {
    console.error("Answer error", error);
    response.status(500).json({ error: "Failed to generate answer" });
  }
});

const bootstrap = async () => {
  chunkPayload = await readJson<ChunkPayload>(CHUNKS_FILE);

  try {
    const darazPayload = JSON.parse(await readFile(DARAZ_PRODUCTS_FILE, "utf8")) as {
      products?: DarazProduct[];
    };
    darazProducts = darazPayload.products ?? [];
  } catch {
    darazProducts = [];
  }

  app.listen(port, () => {
    console.log(`RAG server running on http://localhost:${port}`);
    console.log(`Loaded ${chunkPayload.chunkCount} chunks`);
    console.log(`Loaded ${darazProducts.length} Daraz products`);
  });
};

bootstrap().catch((error) => {
  console.error("Failed to start RAG server", error);
  process.exit(1);
});
