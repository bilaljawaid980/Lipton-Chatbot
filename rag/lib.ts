import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const DATA_DIR = path.resolve(process.cwd(), "rag", "data");
export const RAW_PAGES_FILE = path.join(DATA_DIR, "lipton-pages.json");
export const CHUNKS_FILE = path.join(DATA_DIR, "lipton-chunks.json");
export const DARAZ_PRODUCTS_FILE = path.join(DATA_DIR, "daraz-products.json");

export const ensureDataDir = async () => {
  await mkdir(DATA_DIR, { recursive: true });
};

export const writeJson = async <T>(targetFile: string, data: T) => {
  await ensureDataDir();
  await writeFile(targetFile, JSON.stringify(data, null, 2), "utf8");
};

export const readJson = async <T>(targetFile: string): Promise<T> => {
  const content = await readFile(targetFile, "utf8");
  return JSON.parse(content) as T;
};

export const normalizeWhitespace = (text: string) =>
  text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();

export const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const cosineSimilarity = (a: number[], b: number[]) => {
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

const sentenceSplitRegex = /(?<=[.!?])\s+(?=[A-Z0-9])/g;

export const createChunks = (text: string, chunkSize = 900, overlap = 120) => {
  const clean = normalizeWhitespace(text);
  if (!clean) {
    return [] as string[];
  }

  const sentences = clean.split(sentenceSplitRegex).filter(Boolean);
  if (sentences.length === 0) {
    return [clean.slice(0, chunkSize)];
  }

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= chunkSize) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      const tail = current.slice(-overlap);
      current = `${tail} ${sentence}`.trim();
    } else {
      chunks.push(sentence.slice(0, chunkSize));
      current = sentence.slice(chunkSize - overlap);
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.map((value) => normalizeWhitespace(value)).filter(Boolean);
};

export const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export const lexicalScore = (query: string, document: string) => {
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
