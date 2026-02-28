import { readFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";

type Chunk = {
  id: string;
  url: string;
  title: string;
  text: string;
  tokenEstimate: number;
  vector: number[] | null;
};

type DarazProduct = {
  title: string;
  price: string;
  itemUrl: string;
  sellerName: string;
  location: string;
};

type QueryResult = {
  chunk: Chunk;
  score: number;
};

const DATA_DIR = path.resolve(process.cwd(), "rag", "data");
const CHUNKS_FILE = path.join(DATA_DIR, "lipton-chunks.json");
const DARAZ_PRODUCTS_FILE = path.join(DATA_DIR, "daraz-products.json");

const normalizeWhitespace = (text: string) =>
  text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();

const cosineSimilarity = (a: number[], b: number[]) => {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const lexicalScore = (query: string, document: string) => {
  const queryTokens = normalizeWhitespace(query)
    .toLowerCase()
    .split(" ")
    .filter((token) => token.length > 2);

  if (queryTokens.length === 0) {
    return 0;
  }

  const documentLower = normalizeWhitespace(document).toLowerCase();
  let score = 0;

  for (const token of queryTokens) {
    if (documentLower.includes(token)) {
      score += 1;
    }
  }

  return score / queryTokens.length;
};

const readJson = async <T>(targetFile: string): Promise<T> => {
  const content = await readFile(targetFile, "utf8");
  return JSON.parse(content) as T;
};

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

type Corpus = {
  chunkPayload: ChunkPayload;
  darazProducts: DarazProduct[];
};

let cachedCorpus: Promise<Corpus> | null = null;

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

const apiKey = process.env.VERCEL_AI_GATEWAY_API_KEY ?? process.env.OPENAI_API_KEY;
const openai = apiKey ? new OpenAI({ apiKey, baseURL: baseURL || undefined }) : null;
const complaintGmail = process.env.RAG_COMPLAINT_GMAIL ?? "";

const emptyCorpus: Corpus = {
  chunkPayload: {
    source: "missing",
    crawledAt: "",
    builtAt: "",
    chunkCount: 0,
    embeddingModel: null,
    chunks: [],
  },
  darazProducts: [],
};

const loadCorpus = async (): Promise<Corpus> => {
  try {
    const chunkPayload = await readJson<ChunkPayload>(CHUNKS_FILE);
    let darazProducts: DarazProduct[] = [];

    try {
      const darazPayload = JSON.parse(await readFile(DARAZ_PRODUCTS_FILE, "utf8")) as {
        products?: DarazProduct[];
      };
      darazProducts = darazPayload.products ?? [];
    } catch {
      darazProducts = [];
    }

    return {
      chunkPayload,
      darazProducts,
    };
  } catch {
    return emptyCorpus;
  }
};

const getCorpus = () => {
  if (!cachedCorpus) {
    cachedCorpus = loadCorpus();
  }
  return cachedCorpus;
};

const rankByVector = async (question: string, topK: number, chunks: Chunk[]): Promise<QueryResult[]> => {
  if (!openai) {
    return [];
  }

  const vectorChunks = chunks.filter((chunk) => Array.isArray(chunk.vector));
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

const rankLexical = (question: string, topK: number, chunks: Chunk[]): QueryResult[] =>
  chunks
    .map((chunk) => ({
      chunk,
      score: lexicalScore(question, `${chunk.title} ${chunk.text}`),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

const getMatches = async (question: string, topK: number, chunks: Chunk[]) => {
  let results = await rankByVector(question, topK, chunks);
  let retrieval = "semantic";

  if (results.length === 0) {
    results = rankLexical(question, topK, chunks);
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
    return "I couldn’t find matching Lipton content for that question yet. Please try a different wording.";
  }

  const snippets = results
    .slice(0, 2)
    .map((result, index) => {
      const shortText = result.chunk.text.slice(0, 260).trim();
      return `${index + 1}. ${result.chunk.title}: ${shortText}${result.chunk.text.length > 260 ? "..." : ""}`;
    })
    .join("\n");

  return `Here is what I found on Lipton pages:\n${snippets}`;
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

const isBuyIntent = (question: string) => /\b(buy|purchase|order|shop|get one|where to buy)\b/i.test(question);

const isPriceIntent = (question: string) =>
  /\b(price|prices|cost|costs|rate|rates|how much|pricing)\b/i.test(question);

const isComplaintIntent = (question: string) =>
  /\b(complaint|complain|issue|problem|damaged|refund|bad|not good|quality|too sour|sour|too bitter|bitter|taste change|tastes weird|stale|expired|not fresh|too strong|too weak|doesn'?t taste right|does not taste right)\b/i.test(
    question,
  );

const getBestBuyUrl = (results: QueryResult[], darazProducts: DarazProduct[]) => {
  if (darazProducts.length > 0 && darazProducts[0].itemUrl) {
    return darazProducts[0].itemUrl;
  }

  const productMatch = results.find((result) => /\/our-teas\//i.test(result.chunk.url));
  if (productMatch) {
    return productMatch.chunk.url;
  }
  return results[0]?.chunk.url ?? "https://www.daraz.pk/catalog/?q=lipton%20tea";
};

const buildDarazPriceAnswer = (darazProducts: DarazProduct[]) => {
  if (darazProducts.length === 0) {
    return "I couldn’t fetch Daraz prices yet.";
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

const getActions = (question: string, results: QueryResult[], darazProducts: DarazProduct[]) => {
  const actions: AnswerAction[] = [];

  if (isBuyIntent(question) || isPriceIntent(question)) {
    actions.push({
      type: "open_url",
      label: "Open Daraz tea page",
      url: getBestBuyUrl(results, darazProducts),
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

export const getRagHealth = async () => {
  const { chunkPayload } = await getCorpus();
  return {
    ok: true,
    chunkCount: chunkPayload.chunkCount,
    semanticEnabled: Boolean(openai) && chunkPayload.chunks.some((chunk) => Array.isArray(chunk.vector)),
  };
};

export const answerQuestion = async (question: string, topK = 4) => {
  const { chunkPayload, darazProducts } = await getCorpus();
  const { results, retrieval } = await getMatches(question, topK, chunkPayload.chunks);
  const context = buildContext(results);

  let answer = (await generateAnswer(question, context)) ?? buildFallbackAnswer(results);

  if (isPriceIntent(question) || isBuyIntent(question)) {
    answer = buildDarazPriceAnswer(darazProducts);
  }

  if (isComplaintIntent(question)) {
    answer = buildComplaintAnswer();
  }

  return {
    question,
    retrieval,
    answer,
    actions: getActions(question, results, darazProducts),
    matches: results.map((result) => ({
      id: result.chunk.id,
      url: result.chunk.url,
      title: result.chunk.title,
      score: Number(result.score.toFixed(5)),
    })),
  };
};
