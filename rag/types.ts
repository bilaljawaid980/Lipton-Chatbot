export type ScrapedPage = {
  url: string;
  title: string;
  description: string;
  text: string;
  scrapedAt: string;
};

export type Chunk = {
  id: string;
  url: string;
  title: string;
  text: string;
  tokenEstimate: number;
  vector: number[] | null;
};

export type QueryResult = {
  chunk: Chunk;
  score: number;
};

export type DarazProduct = {
  title: string;
  price: string;
  itemUrl: string;
  sellerName: string;
  location: string;
};
