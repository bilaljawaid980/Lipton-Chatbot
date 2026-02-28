import "dotenv/config";
import * as cheerio from "cheerio";

import { DARAZ_PRODUCTS_FILE, RAW_PAGES_FILE, normalizeWhitespace, sleep, writeJson } from "../lib.js";
import type { DarazProduct, ScrapedPage } from "../types.js";

const BASE_URL = "https://www.lipton.com/us/en/";
const BASE_HOST = "www.lipton.com";
const ALLOWED_PREFIX = "/us/en/";
const ROBOTS_URL = "https://www.lipton.com/robots.txt";
const SITEMAP_URL = process.env.LIPTON_SITEMAP_URL ?? "https://www.lipton.com/us/en/sitemap.xml";
const DARAZ_SEARCH_URL = process.env.DARAZ_SEARCH_URL ?? "https://www.daraz.pk/catalog/?ajax=true&q=lipton%20tea";
const REQUIRED_SEED_URLS = [
  "https://www.lipton.com/us/en/world-of-tea/",
  "https://www.lipton.com/us/en/world-of-tea/benefits-of-matcha-tea",
  "https://www.lipton.com/us/en/world-of-tea/journey-of-matcha-tea",
  "https://www.lipton.com/us/en/world-of-tea/how-to-make-iced-tea",
];

const maxPages = Number(process.env.LIPTON_MAX_PAGES ?? "80");
const delayMs = Number(process.env.LIPTON_REQUEST_DELAY_MS ?? "450");
const darazMaxItems = Number(process.env.DARAZ_MAX_ITEMS ?? "12");

const normalizeUrl = (input: string) => {
  const resolved = new URL(input, BASE_URL);

  if (resolved.host !== BASE_HOST) {
    return null;
  }

  if (!resolved.pathname.startsWith(ALLOWED_PREFIX)) {
    return null;
  }

  resolved.hash = "";
  resolved.search = "";

  if (resolved.pathname.endsWith("/") && resolved.pathname !== ALLOWED_PREFIX) {
    resolved.pathname = resolved.pathname.slice(0, -1);
  }

  return resolved.toString();
};

const extractText = (html: string) => {
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, img, nav, footer, header, form, iframe").remove();

  const title = normalizeWhitespace($("title").first().text());
  const description = normalizeWhitespace(
    $("meta[name='description']").attr("content") ?? "",
  );

  const contentRoot = $("main").first().length > 0 ? $("main").first() : $("body");
  const text = normalizeWhitespace(contentRoot.text());

  const links = new Set<string>();
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) {
      return;
    }
    const normalized = normalizeUrl(href);
    if (normalized) {
      links.add(normalized);
    }
  });

  return {
    title,
    description,
    text,
    links: [...links],
  };
};

type DarazResponse = {
  mods?: {
    listItems?: Array<{
      name?: string;
      priceShow?: string;
      itemUrl?: string;
      sellerName?: string;
      location?: string;
    }>;
  };
};

const scrapeDarazProducts = async () => {
  try {
    const response = await fetch(DARAZ_SEARCH_URL, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; LiptonRagBot/1.0; +https://github.com/bilaljawaid980/lipton-reimagined)",
      },
    });

    if (!response.ok) {
      console.warn(`[daraz] failed (${response.status})`);
      return [] as DarazProduct[];
    }

    const payload = (await response.json()) as DarazResponse;
    const items = payload.mods?.listItems ?? [];

    const products = items
      .filter((item) => item.name && item.priceShow && item.itemUrl)
      .slice(0, darazMaxItems)
      .map((item) => ({
        title: normalizeWhitespace(item.name ?? ""),
        price: normalizeWhitespace(item.priceShow ?? ""),
        itemUrl: item.itemUrl?.startsWith("//")
          ? `https:${item.itemUrl}`
          : item.itemUrl ?? "",
        sellerName: normalizeWhitespace(item.sellerName ?? ""),
        location: normalizeWhitespace(item.location ?? ""),
      }))
      .filter((item) => item.title && item.price && item.itemUrl);

    await writeJson(DARAZ_PRODUCTS_FILE, {
      source: DARAZ_SEARCH_URL,
      scrapedAt: new Date().toISOString(),
      count: products.length,
      products,
    });

    console.log(`[daraz] saved ${products.length} products to ${DARAZ_PRODUCTS_FILE}`);
    return products;
  } catch (error) {
    console.warn("[daraz] scraping error", error);
    return [] as DarazProduct[];
  }
};

const getXmlTagValues = (xml: string, tagName: string) => {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, "gis");
  const values: string[] = [];
  let match = regex.exec(xml);

  while (match) {
    values.push(match[1].trim());
    match = regex.exec(xml);
  }

  return values;
};

const fetchSitemapXml = async (url: string) => {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; LiptonRagBot/1.0; +https://github.com/bilaljawaid980/lipton-reimagined)",
      },
    });

    if (!response.ok) {
      console.warn(`[sitemap] failed ${url} -> ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.warn(`[sitemap] fetch error ${url}`, error);
    return null;
  }
};

const discoverSitemapUrls = async () => {
  const urls = new Set<string>([SITEMAP_URL]);

  try {
    const response = await fetch(ROBOTS_URL, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; LiptonRagBot/1.0; +https://github.com/bilaljawaid980/lipton-reimagined)",
      },
    });

    if (response.ok) {
      const robotsContent = await response.text();
      const sitemapMatches = robotsContent.matchAll(/^sitemap:\s*(.+)$/gim);
      for (const match of sitemapMatches) {
        const sitemap = match[1]?.trim();
        if (sitemap) {
          urls.add(sitemap);
        }
      }
    }
  } catch (error) {
    console.warn("[sitemap] robots discovery failed", error);
  }

  return [...urls];
};

const discoverFromSitemap = async () => {
  const discovered = new Set<string>();
  const sitemapQueue: string[] = await discoverSitemapUrls();
  const seenSitemaps = new Set<string>();

  while (sitemapQueue.length > 0) {
    const current = sitemapQueue.shift();
    if (!current || seenSitemaps.has(current)) {
      continue;
    }
    seenSitemaps.add(current);

    const xml = await fetchSitemapXml(current);
    if (!xml) {
      continue;
    }

    const nestedSitemaps = getXmlTagValues(xml, "loc").filter((value) => value.includes("sitemap"));
    for (const nested of nestedSitemaps) {
      if (!seenSitemaps.has(nested) && !sitemapQueue.includes(nested)) {
        sitemapQueue.push(nested);
      }
    }

    const urlLocs = getXmlTagValues(xml, "loc").filter((value) => value.startsWith("http"));
    for (const url of urlLocs) {
      const normalized = normalizeUrl(url);
      if (normalized) {
        discovered.add(normalized);
      }
    }
  }

  return [...discovered];
};

const run = async () => {
  await scrapeDarazProducts();

  const sitemapSeeds = await discoverFromSitemap();
  console.log(`[sitemap] discovered ${sitemapSeeds.length} candidate Lipton URLs`);

  const queue: string[] = [BASE_URL, ...REQUIRED_SEED_URLS, ...sitemapSeeds];
  const visited = new Set<string>();
  const pages: ScrapedPage[] = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    try {
      const response = await fetch(current, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; LiptonRagBot/1.0; +https://github.com/bilaljawaid980/lipton-reimagined)",
        },
      });

      if (!response.ok) {
        console.warn(`[skip] ${current} -> HTTP ${response.status}`);
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        continue;
      }

      const html = await response.text();
      const { title, description, text, links } = extractText(html);

      if (text.length < 80) {
        continue;
      }

      pages.push({
        url: current,
        title,
        description,
        text,
        scrapedAt: new Date().toISOString(),
      });

      for (const link of links) {
        if (!visited.has(link) && !queue.includes(link)) {
          queue.push(link);
        }
      }

      console.log(`[page ${pages.length}] ${current}`);
      await sleep(delayMs);
    } catch (error) {
      console.warn(`[error] ${current}`, error);
    }
  }

  await writeJson(RAW_PAGES_FILE, {
    source: BASE_URL,
    crawledAt: new Date().toISOString(),
    count: pages.length,
    pages,
  });

  console.log(`Saved ${pages.length} pages to ${RAW_PAGES_FILE}`);
};

run().catch((error) => {
  console.error("Scrape failed", error);
  process.exit(1);
});
