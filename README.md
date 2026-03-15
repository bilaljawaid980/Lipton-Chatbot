# Lipton Chatbot

This repository contain a Lipton-themed React frontend and a Node/TypeScript RAG backend used to answer tea-related questions from scraped Lipton content.

## Local development

Requirements:

- Node.js 18+
- npm

Install and run:

```sh
npm install
npm run dev
```

The frontend runs on `http://localhost:8080` by default.

## Stack

- Vite
- React + TypeScript
- Tailwind + shadcn-ui
- Express + OpenAI-compatible API client for RAG

## Lipton RAG pipeline (scrape + retrieval)

This repo now includes a lightweight RAG pipeline for Lipton content so you can connect it to your chat UI.

### 1) Install dependencies

```sh
npm install
```

### 2) Configure environment

Copy `.env.example` to `.env` and set values.

```sh
cp .env.example .env
```

Required for semantic retrieval:

- `OPENAI_API_KEY` **or** `VERCEL_AI_GATEWAY_API_KEY`

For Vercel AI Gateway, set:

- `RAG_OPENAI_BASE_URL=https://ai-gateway.vercel.sh/v1`
- model names with provider prefix, e.g.:
	- `RAG_EMBEDDING_MODEL=openai/text-embedding-3-small`
	- `RAG_CHAT_MODEL=openai/gpt-4o-mini`

Optional:

- `LIPTON_MAX_PAGES` (default `80`)
- `LIPTON_REQUEST_DELAY_MS` (default `450`)
- `RAG_DISABLE_EMBEDDINGS` (`true` to skip embeddings and use lexical fallback)
- `RAG_CHAT_MODEL` (default `gpt-4o-mini`)
- `RAG_COMPLAINT_GMAIL` (complaint destination, e.g. `yourname@gmail.com`)
- `DARAZ_SEARCH_URL` (default `https://www.daraz.pk/catalog/?ajax=true&q=lipton%20tea`)
- `DARAZ_MAX_ITEMS` (number of Daraz products to store for buy actions)

### 3) Scrape Lipton US pages

```sh
npm run scrape:lipton
```

Writes raw crawled pages to `rag/data/lipton-pages.json`.

Also writes Daraz tea products with prices to `rag/data/daraz-products.json`.

### 4) Build the RAG chunk index

```sh
npm run rag:build
```

Writes chunked retrieval index to `rag/data/lipton-chunks.json`.

### 5) Run retrieval API server

```sh
npm run rag:server
```

Endpoints:

- `GET /api/rag/health`
- `POST /api/rag/query`
- `POST /api/rag/answer`

Request body example:

```json
{
	"question": "Which Lipton tea is caffeine-free?",
	"topK": 5
}
```

Response includes:

- ranked source matches
- merged `context` string ready for your chat LLM prompt

`POST /api/rag/answer` returns a direct answer for your chat UI:

- with `OPENAI_API_KEY`: generated answer from retrieved context
- without `OPENAI_API_KEY`: fallback answer synthesized from top matching chunks

The floating chat widget in the homepage is already wired to call this endpoint.

Additional chat actions:

- Buy intent (e.g. "I want to buy green tea") returns an `Open Daraz tea page` action button and includes top scraped Daraz prices.
- Complaint intent (e.g. "I want to complain") returns a `Send complaint email` button using `mailto:` to `RAG_COMPLAINT_GMAIL`.
