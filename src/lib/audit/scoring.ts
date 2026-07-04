import type {
  AuditCategory,
  AuditCategoryId,
  AuditCheck,
  AuditPage,
  AuditResult,
  CheckStatus,
  DiscoveredAsset,
} from "./types";

type Evidence = {
  url: string;
  discoveredUrls: string[];
  pages: AuditPage[];
  assets: DiscoveredAsset[];
};

export const AUDIT_RUBRIC_VERSION = "2026-07-04-scoring-v2";

const CATEGORY_META: Record<
  AuditCategoryId,
  Pick<AuditCategory, "id" | "title" | "description">
> = {
  agentReadiness: {
    id: "agentReadiness",
    title: "Agent Readiness",
    description: "Can an AI agent crawl, understand, and use the docs?",
  },
  developerOnboarding: {
    id: "developerOnboarding",
    title: "Developer Onboarding",
    description: "Can a developer reach a working first request quickly?",
  },
  apiSdkCoverage: {
    id: "apiSdkCoverage",
    title: "API & SDK Coverage",
    description: "Are endpoints, SDKs, examples, and lifecycle details complete?",
  },
  contentDemos: {
    id: "contentDemos",
    title: "Content & Demos",
    description: "Are there tutorials, videos, cookbooks, and examples that teach?",
  },
  trustCommunity: {
    id: "trustCommunity",
    title: "Trust & Community",
    description: "Can developers verify reliability, support, and community health?",
  },
  llmDiscoverability: {
    id: "llmDiscoverability",
    title: "LLM Discoverability",
    description: "Is the platform surfaced clearly to search engines and LLMs?",
  },
};

const KEYWORDS = {
  quickstart: ["quickstart", "getting started", "start here", "first request"],
  api: ["api reference", "endpoint", "request", "response", "curl", "webhook"],
  sdk: ["sdk", "node", "python", "typescript", "javascript", "go", "rust"],
  auth: ["api key", "authorization", "bearer", "authentication", "auth"],
  errors: ["error", "retry", "rate limit", "status code", "troubleshoot"],
  llm: ["llms.txt", "llm", "agent", "mcp", "openapi", "schema"],
  video: ["youtube", "video", "demo", "walkthrough", "webinar", "livestream"],
  trust: ["status", "security", "privacy", "terms", "soc 2", "subprocessor"],
};

const MIN_KEYWORD_OCCURRENCES = 2;

/**
 * Determines whether a scanned site looks like a developer documentation or API
 * platform rather than a personal portfolio, marketing page, or unrelated website.
 *
 * Scoring (max 14 pts, threshold 5):
 *   Code blocks        → up to 3 pts  (technical docs always have code)
 *   API keywords       → up to 3 pts  (endpoint, curl, webhook, …)
 *   Own docs asset     → 3 pts        (docs/quickstart/apiReference on same root)
 *   Auth keywords      → up to 2 pts  (api key, bearer, …)
 *   Docs URL pattern   → 2 pts        (docs.*, /docs, /api, developer.*)
 *   SDK keyword depth  → 1 pt         (≥ 3 of node/python/typescript/…)
 */
export function detectDevDocs(
  context: { pagesText: string; codeBlocks: number; assets: DiscoveredAsset[] },
  inputUrl: string,
): { isDevDocs: boolean; confidence: number } {
  let score = 0;

  if (context.codeBlocks >= 5) score += 3;
  else if (context.codeBlocks >= 2) score += 2;
  else if (context.codeBlocks >= 1) score += 1;

  const apiHits = keywordHits(context.pagesText, KEYWORDS.api).length;
  if (apiHits >= 4) score += 3;
  else if (apiHits >= 2) score += 2;
  else if (apiHits >= 1) score += 1;

  // Only count docs assets that belong to the same root domain as the scanned URL
  let urlHostname = "";
  try {
    urlHostname = new URL(normalizeUrl(inputUrl)).hostname;
  } catch { /* ignore */ }

  const hasSameDomainDocsAsset = context.assets.some((a) => {
    if (!["docs", "apiReference", "quickstart"].includes(a.type)) return false;
    try {
      const assetHost = new URL(a.url).hostname;
      // same hostname, or subdomain of it (docs.x.com → x.com), or parent of it
      return (
        assetHost === urlHostname ||
        assetHost.endsWith(`.${urlHostname}`) ||
        urlHostname.endsWith(`.${assetHost}`)
      );
    } catch {
      return false;
    }
  });
  if (hasSameDomainDocsAsset) score += 3;

  const authHits = keywordHits(context.pagesText, KEYWORDS.auth).length;
  if (authHits >= 2) score += 2;
  else if (authHits >= 1) score += 1;

  if (/docs\.|\/docs|developer\.|\/api(\/|$)|reference\./.test(inputUrl.toLowerCase())) score += 2;

  const sdkHits = keywordHits(context.pagesText, KEYWORDS.sdk).length;
  if (sdkHits >= 3) score += 1;

  return { isDevDocs: score >= 5, confidence: score / 14 };
}

export function scoreAudit(evidence: Evidence): AuditResult {
  const pagesText = evidence.pages
    .map((page) => `${page.url}\n${page.title ?? ""}\n${page.markdown ?? ""}`)
    .join("\n")
    .toLowerCase();
  const allUrls = evidence.discoveredUrls.concat(
    evidence.pages.flatMap((page) => page.links),
    evidence.assets.map((asset) => asset.url),
  );
  const externalLinks = allUrls.filter((link) => isExternal(evidence.url, link));
  const codeBlocks = (pagesText.match(/```/g)?.length ?? 0) / 2;

  const context = {
    pagesText,
    allUrls,
    externalLinks,
    assets: evidence.assets,
    codeBlocks,
  };

  const categories = [
    buildCategory("agentReadiness", [
      checkAsset(context, "llms", "Has llms.txt", "Machine-readable docs entrypoint exists.", 16, "Publish /llms.txt and link it from docs."),
      checkAsset(context, "openapi", "Exposes OpenAPI or schema", "Agents can inspect endpoint contracts without guessing.", 14, "Publish an OpenAPI spec and keep it versioned."),
      checkKeyword(context, KEYWORDS.llm, "Mentions agents, LLMs, MCP, or schemas", "Docs acknowledge agent-first usage patterns.", 10, "Add an agent integration guide with examples."),
      checkCodeBlocks(context, 5, "Preserves enough code examples", "Scraped docs include copyable examples for agents to reuse.", 12, "Add more complete code snippets with expected outputs."),
      checkDocsDepth(context, 8, "Enough crawlable docs pages", "The audit found a meaningful docs surface.", 12, "Expose docs pages through sitemap and internal links."),
    ]),
    buildCategory("developerOnboarding", [
      checkAsset(context, "quickstart", "Has quickstart or getting-started page", "A new developer has an obvious first path.", 16, "Create a 5-minute quickstart with one complete working request."),
      checkKeyword(context, KEYWORDS.auth, "Explains authentication/API keys", "Developers can set credentials correctly.", 12, "Show API key setup and environment variable examples."),
      checkKeyword(context, ["curl"], "Includes cURL examples", "cURL is the fastest universal test path.", 10, "Add cURL to the first-request flow.", { passCount: 2 }),
      checkKeyword(context, ["response", "success", "json"], "Shows response examples", "Developers can compare expected output.", 10, "Show realistic success and error responses."),
      checkAsset(context, "playground", "Links to playground or sandbox", "Developers can test before integrating.", 8, "Add a playground CTA beside quickstarts."),
    ]),
    buildCategory("apiSdkCoverage", [
      checkAsset(context, "apiReference", "Has API reference", "Endpoint details are discoverable.", 16, "Create a complete API reference for every endpoint."),
      checkKeyword(context, KEYWORDS.sdk, "Covers SDKs/languages", "Developers can find their stack quickly.", 14, "Add SDK landing pages and package links."),
      checkAsset(context, "package", "Links package registries", "npm/PyPI/etc. package paths are visible.", 8, "Link official packages near install snippets."),
      checkKeyword(context, KEYWORDS.errors, "Documents errors, retries, and limits", "Production behavior is clear.", 10, "Add a reliability section for errors, retries, and rate limits."),
      checkAsset(context, "changelog", "Has changelog", "Developers can track product/API changes.", 8, "Publish a changelog and link it from docs."),
    ]),
    buildCategory("contentDemos", [
      checkAsset(context, "video", "Has demo/tutorial video links", "Video assets help developers understand fast.", 14, "Create short demos for core workflows and embed them."),
      checkAsset(context, "blog", "Has technical blog/tutorials", "Searchable content teaches real use cases.", 10, "Publish cookbooks targeting high-intent searches."),
      checkKeyword(context, ["cookbook", "example", "template"], "Includes examples, templates, or cookbooks", "Developers can adapt working patterns.", 10, "Add real-world example repos and templates."),
      checkAsset(context, "github", "Links GitHub examples or repos", "Developers can inspect source code.", 8, "Add official GitHub examples for each major framework."),
    ]),
    buildCategory("trustCommunity", [
      checkAsset(context, "github", "Links GitHub", "Open-source or example code is discoverable.", 10, "Link GitHub from docs, footer, and quickstarts."),
      checkAsset(context, "community", "Links Discord/Slack/community", "Developers know where to ask questions.", 10, "Add a community CTA in docs and support pages."),
      checkAsset(context, "status", "Has status page", "Reliability is transparent.", 10, "Publish and link a status page."),
      checkAsset(context, "security", "Has security/privacy/legal pages", "Enterprise trust artifacts are visible.", 10, "Add security, privacy, terms, and data handling pages."),
      checkAsset(context, "social", "Links socials", "The product has visible public presence.", 6, "Link X/LinkedIn/YouTube where developers look."),
    ]),
    buildCategory("llmDiscoverability", [
      checkAsset(context, "sitemap", "Has sitemap", "Search engines and crawlers can discover the site.", 12, "Publish sitemap.xml and keep it updated."),
      checkAsset(context, "llms", "Has LLM docs entrypoint", "LLMs can find canonical documentation.", 14, "Publish llms.txt and llms-full.txt."),
      checkAsset(context, "pricing", "Pricing is discoverable", "Commercial evaluation is answerable.", 8, "Link pricing from homepage/docs."),
      checkKeyword(context, ["comparison", "alternative", "vs ", "use case"], "Has use-case or comparison content", "LLMs can map product to buyer intent.", 8, "Create use-case and comparison guides."),
      checkPagesHaveTitles(evidence.pages, "Pages expose useful titles", "Scraped metadata is understandable.", 8, "Improve page titles and meta descriptions."),
    ]),
  ];

  const overallScore = weightedScore(categories.flatMap((category) => category.checks));
  const failed = categories.flatMap((category) => category.checks).filter((check) => check.status === "fail");
  const passed = categories.flatMap((category) => category.checks).filter((check) => check.status === "pass");
  const { isDevDocs } = detectDevDocs(context, evidence.url);

  return {
    url: evidence.url,
    normalizedUrl: normalizeUrl(evidence.url),
    scannedAt: new Date().toISOString(),
    rubricVersion: AUDIT_RUBRIC_VERSION,
    overallScore,
    isDevDocs,
    categories,
    pages: evidence.pages,
    assets: dedupeAssets(evidence.assets),
    summary: {
      strengths: passed.slice(0, 4).map((check) => check.label),
      risks: failed.slice(0, 5).map((check) => check.label),
      criticalMissing: failed
        .filter((check) => check.weight >= 10)
        .slice(0, 5)
        .map((check) => check.fix ?? check.label),
    },
    stats: {
      discoveredUrls: evidence.discoveredUrls.length,
      scannedPages: evidence.pages.length,
      externalLinks: new Set(externalLinks).size,
      codeBlocks,
      estimatedTokensSaved: Math.max(0, Math.round((pagesText.length / 4) * 0.45)),
    },
  };
}

export function normalizeUrl(input: string) {
  const url = input.startsWith("http") ? input : `https://${input}`;
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.search = "";
  if (parsed.pathname !== "/") {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }
  return parsed.toString().replace(/\/$/, "");
}

function buildCategory(id: AuditCategoryId, checks: AuditCheck[]): AuditCategory {
  return {
    ...CATEGORY_META[id],
    score: weightedScore(checks),
    checks,
  };
}

function weightedScore(checks: AuditCheck[]) {
  const max = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.reduce((sum, check) => {
    const value = check.status === "pass" ? 1 : check.status === "warn" ? 0.5 : 0;
    return sum + check.weight * value;
  }, 0);
  return Math.round((earned / max) * 100);
}

function checkAsset(
  context: { assets: DiscoveredAsset[] },
  type: DiscoveredAsset["type"],
  label: string,
  description: string,
  weight: number,
  fix: string,
): AuditCheck {
  const asset = context.assets.find((item) => item.type === type);
  return {
    id: type,
    label,
    description,
    weight,
    status: asset ? "pass" : "fail",
    evidence: asset?.url,
    fix,
  };
}

function checkKeyword(
  context: { pagesText: string },
  keywords: string[],
  label: string,
  description: string,
  weight: number,
  fix: string,
  options?: { passCount?: number },
): AuditCheck {
  const hits = keywordHits(context.pagesText, keywords);
  const passCount = options?.passCount ?? MIN_KEYWORD_OCCURRENCES;
  const totalOccurrences = hits.reduce((sum, hit) => sum + hit.count, 0);
  const status: CheckStatus =
    totalOccurrences >= passCount ? "pass" : totalOccurrences > 0 ? "warn" : "fail";
  return {
    id: label.toLowerCase().replaceAll(/\W+/g, "-"),
    label,
    description,
    weight,
    status,
    evidence: hits.length ? `Found: ${hits.map((hit) => `${hit.keyword} (${hit.count})`).join(", ")}` : undefined,
    fix,
  };
}

function keywordHits(text: string, keywords: string[]) {
  return keywords
    .map((keyword) => ({
      keyword,
      count: countKeywordOccurrences(text, keyword),
    }))
    .filter((hit) => hit.count > 0);
}

function countKeywordOccurrences(text: string, keyword: string) {
  const normalizedKeyword = keyword.trim().replace(/\s+/g, " ");
  const source = escapeRegex(normalizedKeyword).replace(/\\ /g, "\\s+");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${source}(?![\\p{L}\\p{N}])`, "giu");
  return text.match(pattern)?.length ?? 0;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function checkCodeBlocks(
  context: { codeBlocks: number },
  target: number,
  label: string,
  description: string,
  weight: number,
  fix: string,
): AuditCheck {
  return {
    id: "code-blocks",
    label,
    description,
    weight,
    status: context.codeBlocks >= target ? "pass" : context.codeBlocks > 0 ? "warn" : "fail",
    evidence: `${context.codeBlocks} code blocks found`,
    fix,
  };
}

function checkDocsDepth(
  context: { assets: DiscoveredAsset[] },
  target: number,
  label: string,
  description: string,
  weight: number,
  fix: string,
): AuditCheck {
  const docsCount = context.assets.filter((asset) =>
    ["docs", "apiReference", "quickstart", "sdk"].includes(asset.type),
  ).length;
  return {
    id: "docs-depth",
    label,
    description,
    weight,
    status: docsCount >= target ? "pass" : docsCount >= 3 ? "warn" : "fail",
    evidence: `${docsCount} documentation assets found`,
    fix,
  };
}

function checkPagesHaveTitles(
  pages: AuditPage[],
  label: string,
  description: string,
  weight: number,
  fix: string,
): AuditCheck {
  const withTitles = pages.filter((page) => Boolean(page.title)).length;
  return {
    id: "page-titles",
    label,
    description,
    weight,
    status: withTitles / Math.max(pages.length, 1) > 0.8 ? "pass" : withTitles > 0 ? "warn" : "fail",
    evidence: `${withTitles}/${pages.length} scanned pages had titles`,
    fix,
  };
}

function isExternal(base: string, candidate: string) {
  try {
    return new URL(base).hostname !== new URL(candidate).hostname;
  } catch {
    return false;
  }
}

function dedupeAssets(assets: DiscoveredAsset[]) {
  return Array.from(new Map(assets.map((asset) => [`${asset.type}:${asset.url}`, asset])).values());
}
