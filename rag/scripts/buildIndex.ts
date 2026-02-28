import "dotenv/config";
import OpenAI from "openai";

import {
  CHUNKS_FILE,
  RAW_PAGES_FILE,
  createChunks,
  estimateTokens,
  readJson,
  writeJson,
} from "../lib.js";
import type { Chunk, ScrapedPage } from "../types.js";

type RawPagesPayload = {
  source: string;
  crawledAt: string;
  count: number;
  pages: ScrapedPage[];
};

const baseURL =
  process.env.RAG_OPENAI_BASE_URL ??
  process.env.OPENAI_BASE_URL ??
  process.env.VERCEL_AI_GATEWAY_BASE_URL ??
  "";
const isGateway = baseURL.includes("ai-gateway.vercel.sh");

const embeddingModel =
  process.env.RAG_EMBEDDING_MODEL ??
  (isGateway ? "openai/text-embedding-3-small" : "text-embedding-3-small");
const disableEmbeddings = (process.env.RAG_DISABLE_EMBEDDINGS ?? "false").toLowerCase() === "true";

const getOpenAIClient = () => {
  const key = process.env.VERCEL_AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!key) {
    return null;
  }
  return new OpenAI({
    apiKey: key,
    baseURL: baseURL || undefined,
  });
};

const embedTexts = async (client: OpenAI, inputs: string[]) => {
  const response = await client.embeddings.create({
    model: embeddingModel,
    input: inputs,
  });

  return response.data.map((item) => item.embedding);
};

const run = async () => {
  const rawPayload = await readJson<RawPagesPayload>(RAW_PAGES_FILE);
  const chunks: Chunk[] = [];

  for (const page of rawPayload.pages) {
    const textChunks = createChunks(page.text);
    textChunks.forEach((text, index) => {
      chunks.push({
        id: `${page.url}#${index + 1}`,
        url: page.url,
        title: page.title,
        text,
        tokenEstimate: estimateTokens(text),
        vector: null,
      });
    });
  }

  if (chunks.length === 0) {
    throw new Error("No chunks generated. Run scrape first or verify scraped page content.");
  }

  const openai = getOpenAIClient();
  const canEmbed = !disableEmbeddings && openai;

  if (canEmbed && openai) {
    const batchSize = 50;
    for (let index = 0; index < chunks.length; index += batchSize) {
      const batch = chunks.slice(index, index + batchSize);
      const vectors = await embedTexts(
        openai,
        batch.map((item) => item.text),
      );
      vectors.forEach((vector, vectorIndex) => {
        batch[vectorIndex].vector = vector;
      });
      console.log(`Embedded ${Math.min(index + batch.length, chunks.length)} / ${chunks.length}`);
    }
  } else {
    console.warn(
      "Building chunks without embeddings. Set VERCEL_AI_GATEWAY_API_KEY or OPENAI_API_KEY (and keep RAG_DISABLE_EMBEDDINGS=false) for semantic retrieval.",
    );
  }

  await writeJson(CHUNKS_FILE, {
    source: rawPayload.source,
    crawledAt: rawPayload.crawledAt,
    builtAt: new Date().toISOString(),
    chunkCount: chunks.length,
    embeddingModel: canEmbed ? embeddingModel : null,
    chunks,
  });

  console.log(`Saved ${chunks.length} chunks to ${CHUNKS_FILE}`);
};

run().catch((error) => {
  console.error("Build index failed", error);
  process.exit(1);
});
