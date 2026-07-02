import type { AuditPage, DiscoveredAsset } from "./types";
import { normalizeUrl, scoreAudit } from "./scoring";

type FirecrawlMapLink = {
  url?: string;
  title?: string;
  description?: string;
};

type FirecrawlMapResponse = {
  success?: boolean;
  links?: Array<string | FirecrawlMapLink>;
  data?: {
    links?: Array<string | FirecrawlMapLink>;
  };
};

type FirecrawlScrapeResponse = {
  success?: boolean;
  data?: {
    markdown?: string;
    links?: string[];
    metadata?: Record<string, unknown>;
  };
};

const FIRECRAWL_API = "https://api.firecrawl.dev/v2";
const MAX_LINKS = 80;
const MAX_SCRAPED_PAGES = 14;
const MAX_PAGE_LINKS = 80;
const MAX_ASSETS = 160;

export async function runAudit(inputUrl: string) {
  const normalizedUrl = normalizeUrl(inputUrl);
  const discoveredUrls = await mapSite(normalizedUrl);
  const assets = await discoverAssets(normalizedUrl, discoveredUrls);
  const scanUrls = selectScanUrls(normalizedUrl, discoveredUrls, assets);
  const pages = await Promise.all(scanUrls.map((url) => scrapePage(url)));

  return scoreAudit({
    url: inputUrl,
    discoveredUrls,
    pages: pages.filter(Boolean) as AuditPage[],
    assets: mergeAssets(assets, pages.filter(Boolean) as AuditPage[]),
  });
}

async function mapSite(url: string) {
  const response = await firecrawlFetch<FirecrawlMapResponse>("/map", {
    url,
    limit: MAX_LINKS,
    includeSubdomains: true,
    sitemap: "include",
  });

  const rawLinks = response.links ?? response.data?.links ?? [];
  const links = rawLinks
    .map((item) => (typeof item === "string" ? item : item.url))
    .filter((item): item is string => Boolean(item))
    .map((item) => absolutize(url, item))
    .filter((item): item is string => Boolean(item));

  return unique([url, ...links]).slice(0, MAX_LINKS);
}

async function scrapePage(url: string): Promise<AuditPage | null> {
  try {
    const response = await firecrawlFetch<FirecrawlScrapeResponse>("/scrape", {
      url,
      formats: ["markdown", "links"],
      onlyMainContent: false,
      timeout: 30000,
    });

    const data = response.data;
    if (!data) {
      return null;
    }

    return {
      url,
      title: getStringMetadata(data.metadata, "title"),
      markdown: data.markdown ?? "",
      links: unique(data.links ?? []).slice(0, MAX_PAGE_LINKS),
      metadata: data.metadata ?? {},
    };
  } catch {
    return null;
  }
}

async function discoverAssets(baseUrl: string, urls: string[]): Promise<DiscoveredAsset[]> {
  const deterministicAssets = classifyUrls(urls);
  const specialChecks = await Promise.allSettled([
    checkWellKnown(baseUrl, "/llms.txt", "llms", "llms.txt"),
    checkWellKnown(baseUrl, "/llms-full.txt", "llms", "llms-full.txt"),
    checkWellKnown(baseUrl, "/sitemap.xml", "sitemap", "sitemap.xml"),
    checkWellKnown(baseUrl, "/openapi.json", "openapi", "openapi.json"),
    checkWellKnown(baseUrl, "/openapi.yaml", "openapi", "openapi.yaml"),
  ]);

  return uniqueAssets([
    ...deterministicAssets,
    ...specialChecks.flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : [])),
  ]);
}

function selectScanUrls(baseUrl: string, urls: string[], assets: DiscoveredAsset[]) {
  const priority = [
    baseUrl,
    ...assets
      .filter((asset) =>
        ["docs", "quickstart", "apiReference", "sdk", "pricing", "changelog", "security", "blog"].includes(
          asset.type,
        ),
      )
      .map((asset) => asset.url),
    ...urls.filter((url) => /docs|quickstart|getting-started|api|reference|sdk|guide|blog|pricing/i.test(url)),
  ];

  return unique(priority).slice(0, MAX_SCRAPED_PAGES);
}

function mergeAssets(assets: DiscoveredAsset[], pages: AuditPage[]) {
  const pageAssets = classifyUrls(pages.flatMap((page) => page.links));
  const metadataAssets = pages.flatMap((page) => {
    const source = `${page.title ?? ""}\n${page.markdown ?? ""}`.toLowerCase();
    const found: DiscoveredAsset[] = [];
    if (source.includes("youtube") || source.includes("watch demo")) {
      found.push({ type: "video", label: "Video mention", url: page.url });
    }
    if (source.includes("playground") || source.includes("sandbox")) {
      found.push({ type: "playground", label: "Playground mention", url: page.url });
    }
    return found;
  });

  return uniqueAssets([...assets, ...pageAssets, ...metadataAssets]).slice(0, MAX_ASSETS);
}

function classifyUrls(urls: string[]): DiscoveredAsset[] {
  return urls.flatMap((url) => {
    const lower = url.toLowerCase();
    const assets: DiscoveredAsset[] = [];

    if (/\/docs|docs\.|documentation/.test(lower)) assets.push(asset("docs", "Docs", url));
    if (/quickstart|getting-started|start-here|installation/.test(lower)) assets.push(asset("quickstart", "Quickstart", url));
    if (/api-reference|reference|\/api(\/|$)|openapi|swagger/.test(lower)) assets.push(asset("apiReference", "API reference", url));
    if (/sdk|node|python|typescript|javascript|go|rust|java|elixir/.test(lower)) assets.push(asset("sdk", "SDK docs", url));
    if (/github\.com/.test(lower)) assets.push(asset("github", "GitHub", url));
    if (/npmjs\.com|pypi\.org|crates\.io|mvnrepository|jitpack|hex\.pm/.test(lower)) assets.push(asset("package", "Package registry", url));
    if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com|demo|webinar|video/.test(lower)) assets.push(asset("video", "Demo video", url));
    if (/blog|tutorial|cookbook|guide/.test(lower)) assets.push(asset("blog", "Technical content", url));
    if (/changelog|release-notes|releases/.test(lower)) assets.push(asset("changelog", "Changelog", url));
    if (/pricing|plans|billing/.test(lower)) assets.push(asset("pricing", "Pricing", url));
    if (/status\./.test(lower) || /\/status/.test(lower)) assets.push(asset("status", "Status page", url));
    if (/security|privacy|terms|subprocessor|trust|compliance|soc-?2/.test(lower)) assets.push(asset("security", "Security/legal", url));
    if (/discord|slack|community|forum|discourse/.test(lower)) assets.push(asset("community", "Community", url));
    if (/twitter\.com|x\.com|linkedin\.com|bsky\.app|mastodon|youtube\.com/.test(lower)) assets.push(asset("social", "Social", url));
    if (/playground|sandbox|console|dashboard/.test(lower)) assets.push(asset("playground", "Playground", url));
    if (/llms\.txt|llms-full\.txt/.test(lower)) assets.push(asset("llms", "LLM docs", url));
    if (/openapi|swagger/.test(lower)) assets.push(asset("openapi", "OpenAPI", url));
    if (/sitemap\.xml/.test(lower)) assets.push(asset("sitemap", "Sitemap", url));

    return assets;
  });
}

async function checkWellKnown(
  baseUrl: string,
  path: string,
  type: DiscoveredAsset["type"],
  label: string,
): Promise<DiscoveredAsset | null> {
  const url = new URL(path, baseUrl).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const text = await response.text();
    if (!text.trim()) return null;
    return asset(type, label, url);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function firecrawlFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (process.env.FIRECRAWL_API_KEY) {
    headers.Authorization = `Bearer ${process.env.FIRECRAWL_API_KEY}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(`${FIRECRAWL_API}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Firecrawl ${path} failed: ${response.status} ${details}`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

function asset(type: DiscoveredAsset["type"], label: string, url: string): DiscoveredAsset {
  return { type, label, url };
}

function getStringMetadata(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

function absolutize(baseUrl: string, maybeUrl: string) {
  try {
    return new URL(maybeUrl, baseUrl).toString();
  } catch {
    return null;
  }
}

function unique(items: string[]) {
  return Array.from(new Set(items));
}

function uniqueAssets(assets: DiscoveredAsset[]) {
  return Array.from(new Map(assets.map((item) => [`${item.type}:${item.url}`, item])).values());
}
