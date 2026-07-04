export type CheckStatus = "pass" | "warn" | "fail";

export type AuditCategoryId =
  | "agentReadiness"
  | "developerOnboarding"
  | "apiSdkCoverage"
  | "contentDemos"
  | "trustCommunity"
  | "llmDiscoverability";

export type AuditCheck = {
  id: string;
  label: string;
  description: string;
  status: CheckStatus;
  weight: number;
  evidence?: string;
  fix?: string;
};

export type AuditCategory = {
  id: AuditCategoryId;
  title: string;
  description: string;
  score: number;
  checks: AuditCheck[];
};

export type AuditPage = {
  url: string;
  title?: string;
  markdown?: string;
  links: string[];
  metadata?: Record<string, unknown>;
};

export type DiscoveredAsset = {
  type:
    | "docs"
    | "quickstart"
    | "apiReference"
    | "sdk"
    | "github"
    | "package"
    | "video"
    | "blog"
    | "changelog"
    | "pricing"
    | "status"
    | "security"
    | "community"
    | "social"
    | "playground"
    | "llms"
    | "openapi"
    | "sitemap";
  label: string;
  url: string;
};

export type AuditResult = {
  url: string;
  normalizedUrl: string;
  scannedAt: string;
  rubricVersion: string;
  overallScore: number;
  isDevDocs: boolean;
  summary: {
    strengths: string[];
    risks: string[];
    criticalMissing: string[];
  };
  categories: AuditCategory[];
  pages: AuditPage[];
  assets: DiscoveredAsset[];
  stats: {
    discoveredUrls: number;
    scannedPages: number;
    externalLinks: number;
    codeBlocks: number;
    estimatedTokensSaved?: number;
  };
};

export type AuditApiResponse = {
  auditId: string;
  cached: boolean;
  cachedFromUrl?: string;
  audit: AuditResult;
  credits?: {
    used: number;
    granted: number;
    remaining: number;
  };
};

export type ReportApiResponse = {
  cached: boolean;
  report: AuditReport;
};

export type AuditReport = {
  title: string;
  executiveSummary: string;
  humanReportMarkdown: string;
  agentInstructionsMarkdown: string;
  topIssues: Array<{
    title: string;
    impact: string;
    fix: string;
    cta: string;
  }>;
  roadmap: Array<{
    timeframe: string;
    actions: string[];
  }>;
  suggestedAssets: string[];
  llmsTxtDraft: string;
  rawMarkdown: string;
};
