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
    statusCode?: number;
    metadata?: Record<string, unknown>;
  };
};

const FIRECRAWL_API = "https://api.firecrawl.dev/v2";
const DEFAULT_TIMEOUT_MS = 45000;
const MAP_TIMEOUT_MS = 90000;
const MAX_LINKS = 80;
const MAX_SCRAPED_PAGES = 14;
const MAX_PAGE_LINKS = 80;
const MAX_ASSETS = 320;
const SCAN_ROLES = [
  /quickstart|getting-started|start-here|installation/i,
  /authentication|authorization|api-key|auth/i,
  /api-reference|reference|\/api(\/|$)|openapi|swagger/i,
  /error|retry|rate-limit|limits|troubleshoot/i,
  /sdk|sdks|node|python|typescript|javascript|golang|rust|java|elixir/i,
  /changelog|release-notes|releases/i,
  /pricing|plans|billing/i,
  /security|privacy|terms|subprocessor|trust|compliance|soc-?2/i,
  /blog|tutorial|cookbook|guide/i,
];

export async function runAudit(inputUrl: string) {
  const normalizedUrl = normalizeUrl(inputUrl);
  const supportingOrigins = getSupportingOrigins(normalizedUrl);
  const primaryUrls = await mapSite(normalizedUrl).catch(() => [normalizedUrl]);
  const discoveredUrls = unique([normalizedUrl, ...primaryUrls]);
  const [assets, supportingPages] = await Promise.all([
    discoverAssets(normalizedUrl, discoveredUrls, supportingOrigins),
    Promise.all(supportingOrigins.map((origin) => scrapePage(origin))),
  ]);
  const scanUrls = selectScanUrls(normalizedUrl, discoveredUrls, assets);
  const pages = await Promise.all(scanUrls.map((url) => scrapePage(url)));
  const scannedPages = pages.filter(Boolean) as AuditPage[];
  const assetOnlyPages = supportingPages.filter(Boolean) as AuditPage[];

  return scoreAudit({
    url: inputUrl,
    discoveredUrls,
    pages: scannedPages,
    assets: mergeAssets(assets, [...scannedPages, ...assetOnlyPages]),
  });
}

async function mapSite(url: string, limit = MAX_LINKS) {
  const response = await firecrawlFetch<FirecrawlMapResponse>(
    "/map",
    {
      url,
      limit,
      includeSubdomains: true,
      sitemap: "include",
    },
    MAP_TIMEOUT_MS,
  );

  const rawLinks = response.links ?? response.data?.links ?? [];
  const links = rawLinks
    .map((item) => (typeof item === "string" ? item : item.url))
    .filter((item): item is string => Boolean(item))
    .map((item) => absolutize(url, item))
    .filter((item): item is string => Boolean(item));

  return unique([url, ...links]).slice(0, limit);
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

    const page = {
      url,
      title: getStringMetadata(data.metadata, "title"),
      markdown: data.markdown ?? "",
      links: unique(data.links ?? []).slice(0, MAX_PAGE_LINKS),
      metadata: data.metadata ?? {},
    };

    if (isSoft404(page, data.statusCode)) {
      return null;
    }

    return page;
  } catch {
    return null;
  }
}

async function discoverAssets(
  baseUrl: string,
  urls: string[],
  supportingOrigins: string[],
): Promise<DiscoveredAsset[]> {
  const deterministicAssets = classifyUrls(urls);
  const candidateOrigins = unique([new URL(baseUrl).origin, ...supportingOrigins]);
  const [specialChecks, knownOrgAssets] = await Promise.all([
    Promise.allSettled(
      candidateOrigins.flatMap((origin) => [
        checkWellKnown(origin, "/llms.txt", "llms", "llms.txt"),
        checkWellKnown(origin, "/llms-full.txt", "llms", "llms-full.txt"),
        checkWellKnown(origin, "/sitemap.xml", "sitemap", "sitemap.xml"),
        checkWellKnown(origin, "/sitemap_index.xml", "sitemap", "sitemap.xml"),
        checkRobots(origin),
        checkWellKnown(origin, "/openapi.json", "openapi", "openapi.json"),
        checkWellKnown(origin, "/openapi.yaml", "openapi", "openapi.yaml"),
      ]),
    ),
    discoverKnownOrgAssets(candidateOrigins),
  ]);
  return uniqueAssets([
    ...knownOrgAssets,
    ...specialChecks.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
    ...deterministicAssets,
  ]);
}

function selectScanUrls(baseUrl: string, urls: string[], assets: DiscoveredAsset[]) {
  const candidates = unique([
    ...assets
      .filter((asset) =>
        ["docs", "quickstart", "apiReference", "sdk", "pricing", "changelog", "security", "blog"].includes(
          asset.type,
        ),
      )
      .map((asset) => asset.url),
    ...urls,
  ]);
  const firstPartyCandidates = candidates.filter((url) => isSameRootDomain(baseUrl, url));
  const roleUrls = SCAN_ROLES.flatMap((pattern) => {
    const match = firstPartyCandidates.find((url) => pattern.test(url));
    return match ? [match] : [];
  });
  const priority = [
    baseUrl,
    ...roleUrls,
    ...firstPartyCandidates.filter((url) =>
      /docs|quickstart|getting-started|api|reference|sdk|guide|blog|pricing/i.test(url),
    ),
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
    const parsed = safeUrl(lower);
    const host = parsed?.hostname ?? "";
    const path = parsed?.pathname ?? lower;
    const assets: DiscoveredAsset[] = [];

    if (/^docs\./.test(host) || /\/docs(?:\/|$)|documentation/.test(path)) assets.push(asset("docs", "Docs", url));
    if (/quickstart|getting-started|start-here|installation/.test(lower)) assets.push(asset("quickstart", "Quickstart", url));
    if (/api-reference|reference|\/api(\/|$)|openapi|swagger/.test(lower)) assets.push(asset("apiReference", "API reference", url));
    if (/(^|[/-])(sdk|sdks|node|python|typescript|javascript|go|golang|rust|java|elixir)([/-]|$)/.test(path)) {
      assets.push(asset("sdk", "SDK docs", url));
    }
    if (host === "github.com" || host.endsWith(".github.com")) assets.push(asset("github", "GitHub", url));
    if (/npmjs\.com|pypi\.org|crates\.io|mvnrepository|jitpack|hex\.pm/.test(host)) assets.push(asset("package", "Package registry", url));
    if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com/.test(host) || /(^|[/-])(demo|webinar|video)([/-]|$)/.test(path)) assets.push(asset("video", "Demo video", url));
    if (/(^|[/-])(blog|tutorial|tutorials|cookbook|cookbooks|guide|guides)([/-]|$)/.test(path)) assets.push(asset("blog", "Technical content", url));
    if (/changelog|release-notes/.test(lower)) assets.push(asset("changelog", "Changelog", url));
    if (/pricing|plans|billing/.test(lower)) assets.push(asset("pricing", "Pricing", url));
    if (/^status\./.test(host) || /\/status(?:\/|$)/.test(path)) assets.push(asset("status", "Status page", url));
    if (/security|privacy|terms|subprocessor|trust|compliance|soc-?2/.test(lower)) assets.push(asset("security", "Security/legal", url));
    if (/discord\.com|discord\.gg|slack\.com|community|forum|discourse/.test(lower)) assets.push(asset("community", "Community", url));
    if (/twitter\.com|x\.com|linkedin\.com|bsky\.app|mastodon|youtube\.com/.test(host)) assets.push(asset("social", "Social", url));
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
): Promise<DiscoveredAsset[]> {
  const url = new URL(path, baseUrl).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const text = await response.text();
    if (!text.trim()) return [];
    if (type === "openapi" && !looksLikeOpenApi(text)) return [];
    return uniqueAssets([
      asset(type, label, url),
      ...classifyUrls(extractUrls(text, url)),
    ]);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function checkRobots(baseUrl: string): Promise<DiscoveredAsset[]> {
  const url = new URL("/robots.txt", baseUrl).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    if (!response.ok) return [];
    const text = await response.text();
    return classifyUrls(
      text
        .split("\n")
        .map((line) => line.match(/^sitemap:\s*(.+)$/i)?.[1]?.trim())
        .filter((item): item is string => Boolean(item))
        .map((item) => absolutize(url, item))
        .filter((item): item is string => Boolean(item)),
    );
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function discoverKnownOrgAssets(origins: string[]) {
  const roots = unique(
    origins.map((origin) => getRootDomain(new URL(origin).hostname)).filter((root) => root.includes(".")),
  );
  const candidates = roots.flatMap((root) => {
    const brand = root.split(".")[0];
    return [
      { type: "status" as const, label: "Status page", url: `https://status.${root}` },
      { type: "github" as const, label: "GitHub", url: `https://github.com/${brand}` },
      { type: "openapi" as const, label: "OpenAPI", url: `https://github.com/${brand}/openapi` },
      { type: "community" as const, label: "Community", url: `https://${brand}community.com` },
      { type: "community" as const, label: "Community", url: `https://community.${root}` },
      { type: "community" as const, label: "Forum", url: `https://forum.${root}` },
      { type: "community" as const, label: "Discord", url: `https://discord.${root}` },
      { type: "social" as const, label: "LinkedIn", url: `https://www.linkedin.com/company/${brand}` },
      { type: "social" as const, label: "X", url: `https://x.com/${brand}` },
      { type: "video" as const, label: "YouTube", url: `https://www.youtube.com/@${brand}` },
    ];
  });
  const results = await Promise.allSettled(
    candidates.map(async (candidate) => {
      const reachable = await isReachable(candidate.url);
      if (!reachable) return [];
      return uniqueAssets([asset(candidate.type, candidate.label, candidate.url), ...classifyUrls([candidate.url])]);
    }),
  );

  return uniqueAssets(results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])));
}

async function isReachable(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

function getSupportingOrigins(inputUrl: string) {
  const url = new URL(inputUrl);
  const root = getRootDomain(url.hostname);
  const origins = [url.origin];

  if (root && root !== url.hostname) {
    origins.push(`${url.protocol}//${root}`, `${url.protocol}//www.${root}`);
  } else if (root) {
    origins.push(`${url.protocol}//www.${root}`);
  }

  return unique(origins).filter((origin) => origin !== url.origin);
}

function getRootDomain(hostname: string) {
  const parts = hostname.replace(/^www\./, "").split(".");
  if (parts.length < 2) return hostname;
  return parts.slice(-2).join(".");
}

function isSoft404(page: AuditPage, statusCode?: number) {
  const title = page.title?.toLowerCase() ?? "";
  const markdown = page.markdown?.slice(0, 500).toLowerCase() ?? "";
  return (
    statusCode === 404 ||
    title.includes("page not found") ||
    title === "404" ||
    /(^|\s)(404|not found)(\s|$)/.test(markdown)
  );
}

function looksLikeOpenApi(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return typeof parsed.openapi === "string" || typeof parsed.swagger === "string";
  } catch {
    return /(^|\n)\s*(openapi|swagger)\s*:\s*["']?\d/i.test(trimmed);
  }
}

function extractUrls(text: string, baseUrl: string) {
  const urls = new Set<string>();
  for (const match of text.matchAll(/https?:\/\/[^\s<>)"']+/gi)) {
    urls.add(stripTrailingPunctuation(match[0]));
  }
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const absolute = absolutize(baseUrl, match[1]);
    if (absolute) urls.add(absolute);
  }
  for (const match of text.matchAll(/(^|\s)(\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+)/g)) {
    const absolute = absolutize(baseUrl, match[2]);
    if (absolute) urls.add(absolute);
  }
  return Array.from(urls);
}

function stripTrailingPunctuation(url: string) {
  return url.replace(/[),.;]+$/, "");
}

async function firecrawlFetch<T>(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (process.env.FIRECRAWL_API_KEY) {
    headers.Authorization = `Bearer ${process.env.FIRECRAWL_API_KEY}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Firecrawl ${path} timed out after ${timeoutMs / 1000}s.`);
    }
    throw error;
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

function safeUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isSameRootDomain(baseUrl: string, candidateUrl: string) {
  try {
    return getRootDomain(new URL(baseUrl).hostname) === getRootDomain(new URL(candidateUrl).hostname);
  } catch {
    return false;
  }
}
