"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Flame,
  Lock,
  LogIn,
  LogOut,
  Loader2,
  Radar,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AuditApiResponse, AuditCategory, AuditCheck, AuditReport, AuditResult, CheckStatus, ReportApiResponse } from "@/lib/audit/types";
import { createClient } from "@/lib/supabase/client";

const examples = ["https://www.firecrawl.dev", "https://supabase.com", "https://vercel.com", "https://stripe.com"];

const scanSteps = [
  "Mapping public URLs",
  "Scraping docs and product pages",
  "Finding demos, socials, SDKs, trust pages",
  "Scoring agent and developer readiness",
];

type CurrentUser = {
  email: string;
  name?: string;
};

export function AuditApp({
  user,
  isPaid,
  isSupabaseConfigured,
}: {
  user: CurrentUser | null;
  isPaid: boolean;
  isSupabaseConfigured: boolean;
}) {
  const [url, setUrl] = useState("https://www.firecrawl.dev");
  const [auditId, setAuditId] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [isReportCached, setIsReportCached] = useState(false);
  const [isLockedPreview, setIsLockedPreview] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runScan(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError(null);
    setReport(null);
    setIsReportCached(false);
    setIsAuditing(true);

    if (!user) {
      setAudit(null);
      setAuditId(null);
      setIsCached(false);
      setIsLockedPreview(false);
      await new Promise((resolve) => setTimeout(resolve, 1600));
      setAudit(buildLockedPreviewAudit(url));
      setIsLockedPreview(true);
      setIsAuditing(false);
      return;
    }

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = (await response.json()) as AuditApiResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Audit failed.");
      }
      setAudit(payload.audit);
      setAuditId(payload.auditId);
      setIsCached(payload.cached);
      setIsLockedPreview(false);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Audit failed.");
    } finally {
      setIsAuditing(false);
    }
  }

  async function generateReport() {
    if (!auditId || isLockedPreview) return;
    setError(null);
    setIsReporting(true);

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId }),
      });
      const payload = (await response.json()) as ReportApiResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Report failed.");
      }
      setReport(payload.report);
      setIsReportCached(payload.cached);
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "Report failed.");
    } finally {
      setIsReporting(false);
    }
  }

  async function rescan() {
    if (!user || !isPaid) return;
    setError(null);
    setReport(null);
    setIsReportCached(false);
    setIsAuditing(true);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, force: true }),
      });
      const payload = (await response.json()) as AuditApiResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Audit failed.");
      }
      setAudit(payload.audit);
      setAuditId(payload.auditId);
      setIsCached(payload.cached);
      setIsLockedPreview(false);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Audit failed.");
    } finally {
      setIsAuditing(false);
    }
  }

  async function signInWithGoogle() {
    if (!isSupabaseConfigured) {
      setError("Supabase is not configured yet. Add the Supabase URL and publishable key once Supabase is back.");
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (authError) {
      setError(authError.message);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_32rem),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_24rem)]" />
      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <Header user={user} isPaid={isPaid} onSignIn={signInWithGoogle} onSignOut={signOut} />

        <Card className="border-orange-500/20 bg-card/80 shadow-2xl shadow-orange-950/10 backdrop-blur">
          <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div className="space-y-6">
              <Badge className="w-fit border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
                {user ? "Cache-first docs intelligence" : "Preview without spending scan credits"}
              </Badge>
              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                  Lighthouse for agent-ready developer platforms.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Scan a product website for docs quality, agent readability, SDK coverage, demos, trust assets,
                  socials, and LLM discoverability. Generate a human report plus an agent-ready remediation file when
                  you need the full diagnosis.
                </p>
                {!user ? (
                  <p className="max-w-2xl text-sm text-orange-200">
                    Anonymous searches show a simulated loading state and locked preview only. Real cached results unlock after Google sign-in.
                  </p>
                ) : !isPaid ? (
                  <p className="max-w-2xl text-sm text-orange-200">
                    Signed-in users can load stored scans. Fresh Firecrawl scans are reserved for paid accounts.
                  </p>
                ) : null}
              </div>

              <form onSubmit={runScan} className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://docs.example.com"
                  className="h-12 border-white/10 bg-background/70 font-mono text-sm"
                />
                <Button type="submit" size="lg" disabled={isAuditing} className="h-12 bg-orange-500 text-black hover:bg-orange-400">
                  {isAuditing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radar className="mr-2 h-4 w-4" />}
                  {user ? "Check cache" : "Preview result"}
                </Button>
              </form>

              <div className="flex flex-wrap gap-2">
                {examples.map((example) => (
                  <button
                    key={example}
                    onClick={() => setUrl(example)}
                    className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground transition hover:border-orange-500/50 hover:text-foreground"
                  >
                    {example.replace("https://", "")}
                  </button>
                ))}
              </div>
            </div>

            <ScanPanel audit={audit} isAuditing={isAuditing} />
          </CardContent>
        </Card>

        {error ? (
          <Alert className="border-red-500/30 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Scan issue</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {isAuditing ? <LoadingScorecard /> : null}
        {audit ? (
          <Results
            audit={audit}
            onGenerateReport={generateReport}
            onRescan={rescan}
            isReporting={isReporting}
            report={report}
            isCached={isCached}
            isReportCached={isReportCached}
            isLockedPreview={isLockedPreview}
            user={user}
            isPaid={isPaid}
            onSignIn={signInWithGoogle}
          />
        ) : null}
      </section>
    </main>
  );
}

function Header({
  user,
  isPaid,
  onSignIn,
  onSignOut,
}: {
  user: CurrentUser | null;
  isPaid: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10">
          <Flame className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <p className="font-semibold tracking-tight">AgentDocs Auditor</p>
          <p className="text-xs text-muted-foreground">Human docs. Agent docs. LLM discovery.</p>
        </div>
      </div>
      {user ? (
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{user.name ?? user.email}</p>
            <p className="text-xs text-muted-foreground">{isPaid ? "Paid account" : "Free account"}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={onSignIn} className="border-orange-500/30 text-orange-200">
          <LogIn className="mr-2 h-4 w-4" />
          Sign in with Google
        </Button>
      )}
    </div>
  );
}

function ScanPanel({ audit, isAuditing }: { audit: AuditResult | null; isAuditing: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Scan pipeline</p>
          <p className="text-xs text-muted-foreground">Bounded Firecrawl map + targeted scrape</p>
        </div>
        <Activity className="h-4 w-4 text-orange-300" />
      </div>
      <div className="space-y-3">
        {scanSteps.map((step, index) => (
          <div
            key={step}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-background/40 px-3 py-3"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10 text-xs text-orange-300">
              {isAuditing ? <span className="animate-pulse">{index + 1}</span> : <CheckCircle2 className="h-4 w-4" />}
            </div>
            <span className="text-sm">{step}</span>
          </div>
        ))}
      </div>
      {audit ? (
        <div className="mt-5 grid grid-cols-3 gap-3">
          <MiniMetric label="URLs" value={audit.stats.discoveredUrls} />
          <MiniMetric label="Pages" value={audit.stats.scannedPages} />
          <MiniMetric label="Assets" value={audit.assets.length} />
        </div>
      ) : null}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-background/40 p-3">
      <p className="font-mono text-lg">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function LoadingScorecard() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="bg-card/80">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Results({
  audit,
  onGenerateReport,
  onRescan,
  isReporting,
  report,
  isCached,
  isReportCached,
  isLockedPreview,
  user,
  isPaid,
  onSignIn,
}: {
  audit: AuditResult;
  onGenerateReport: () => void;
  onRescan: () => void;
  isReporting: boolean;
  report: AuditReport | null;
  isCached: boolean;
  isReportCached: boolean;
  isLockedPreview: boolean;
  user: CurrentUser | null;
  isPaid: boolean;
  onSignIn: () => void;
}) {
  const checks = useMemo(() => audit.categories.flatMap((category) => category.checks), [audit]);
  const failingChecks = checks.filter((check) => check.status !== "pass");

  return (
    <div className="relative space-y-6">
      {isLockedPreview ? <LockedPreviewOverlay onSignIn={onSignIn} /> : null}
      <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <Card className="bg-card/80">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Overall Score</CardTitle>
              {isCached ? (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
                  Cached
                </Badge>
              ) : isLockedPreview ? (
                <Badge variant="outline" className="border-orange-500/30 text-orange-200">
                  Locked preview
                </Badge>
              ) : (
                <Badge variant="outline">Fresh scan</Badge>
              )}
            </div>
            <CardDescription>{audit.normalizedUrl}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <ScoreRing score={audit.overallScore} />
            <div className="grid w-full grid-cols-3 gap-3">
              <MiniMetric label="Links" value={audit.stats.discoveredUrls} />
              <MiniMetric label="Scanned" value={audit.stats.scannedPages} />
              <MiniMetric label="Issues" value={failingChecks.length} />
            </div>
            <Button
              onClick={onGenerateReport}
              disabled={isReporting || isLockedPreview || !user}
              className="w-full bg-orange-500 text-black hover:bg-orange-400"
            >
              {isReporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate remediation package
            </Button>
            {isPaid ? (
              <Button variant="outline" onClick={onRescan} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Run paid rescan
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {audit.categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>

      <Tabs defaultValue="issues" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="checks">Checks</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>
        <TabsContent value="issues" className="mt-4">
          <IssueList checks={failingChecks} />
        </TabsContent>
        <TabsContent value="assets" className="mt-4">
          <AssetGrid audit={audit} />
        </TabsContent>
        <TabsContent value="checks" className="mt-4">
          <ChecksTable categories={audit.categories} />
        </TabsContent>
        <TabsContent value="report" className="mt-4">
          <ReportPanel
            report={report}
            isReporting={isReporting}
            onGenerateReport={onGenerateReport}
            isReportCached={isReportCached}
            disabled={isLockedPreview || !user}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative grid h-40 w-40 place-items-center">
      <svg className="h-40 w-40 -rotate-90">
        <circle cx="80" cy="80" r="54" stroke="currentColor" strokeWidth="10" fill="none" className="text-muted" />
        <circle
          cx="80"
          cy="80"
          r="54"
          stroke="currentColor"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-orange-400 transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-mono text-4xl font-semibold">{score}</p>
        <p className="text-xs text-muted-foreground">/ 100</p>
      </div>
    </div>
  );
}

function LockedPreviewOverlay({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-start justify-center rounded-2xl bg-background/20 pt-24 backdrop-blur-sm">
      <Card className="mx-4 max-w-md border-orange-500/30 bg-card/95 shadow-2xl">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
            <Lock className="h-5 w-5 text-orange-300" />
          </div>
          <div>
            <p className="font-medium">Sign in to unlock the stored scan</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This preview did not call Firecrawl. Google sign-in unlocks cached results, and paid users can trigger fresh scans.
            </p>
          </div>
          <Button onClick={onSignIn} className="bg-orange-500 text-black hover:bg-orange-400">
            <LogIn className="mr-2 h-4 w-4" />
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryCard({ category }: { category: AuditCategory }) {
  return (
    <Card className="bg-card/80 transition hover:border-orange-500/30">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{category.title}</CardTitle>
          <ScoreBadge score={category.score} />
        </div>
        <CardDescription>{category.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={category.score} className="h-2" />
      </CardContent>
    </Card>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const className =
    score >= 80
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : score >= 55
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <Badge variant="outline" className={className}>
      {score}
    </Badge>
  );
}

function IssueList({ checks }: { checks: AuditCheck[] }) {
  return (
    <Card className="bg-card/80">
      <CardHeader>
        <CardTitle>Highest-Signal Gaps</CardTitle>
        <CardDescription>The report generator expands these into human-readable and agent-executable fixes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.length ? (
          checks.slice(0, 10).map((check) => (
            <div key={check.id} className="rounded-xl border border-border bg-background/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={check.status} />
                    <p className="font-medium">{check.label}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{check.description}</p>
                  {check.fix ? <p className="mt-3 text-sm text-orange-200">Fix: {check.fix}</p> : null}
                </div>
                <Badge variant="outline">{check.weight} pts</Badge>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No major gaps found in the bounded scan.</p>
        )}
      </CardContent>
    </Card>
  );
}

function AssetGrid({ audit }: { audit: AuditResult }) {
  return (
    <Card className="bg-card/80">
      <CardHeader>
        <CardTitle>Detected Assets</CardTitle>
        <CardDescription>Docs, videos, packages, socials, trust pages, and machine-readable entrypoints.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {audit.assets.map((asset) => (
            <a
              key={`${asset.type}:${asset.url}`}
              href={asset.url}
              target="_blank"
              rel="noreferrer"
              className="group rounded-xl border border-border bg-background/50 p-4 transition hover:border-orange-500/40"
            >
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">{asset.type}</Badge>
                <ExternalLink className="h-4 w-4 text-muted-foreground transition group-hover:text-orange-300" />
              </div>
              <p className="mt-3 truncate text-sm">{asset.label}</p>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{asset.url}</p>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ChecksTable({ categories }: { categories: AuditCategory[] }) {
  return (
    <Card className="bg-card/80">
      <CardHeader>
        <CardTitle>Raw Checks</CardTitle>
        <CardDescription>Transparent scoring evidence, intentionally picky.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category.id}>
              <div className="mb-3 flex items-center justify-between">
                <p className="font-medium">{category.title}</p>
                <ScoreBadge score={category.score} />
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                {category.checks.map((check) => (
                  <div key={check.id} className="grid gap-3 bg-background/40 p-4 md:grid-cols-[1fr_auto]">
                    <div className="flex gap-3">
                      <StatusIcon status={check.status} />
                      <div>
                        <p className="text-sm font-medium">{check.label}</p>
                        <p className="text-xs text-muted-foreground">{check.evidence ?? check.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{check.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportPanel({
  report,
  isReporting,
  onGenerateReport,
  isReportCached,
  disabled,
}: {
  report: AuditReport | null;
  isReporting: boolean;
  onGenerateReport: () => void;
  isReportCached: boolean;
  disabled: boolean;
}) {
  if (isReporting) {
    return (
      <Card className="bg-card/80">
        <CardContent className="space-y-4 p-6">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="bg-card/80">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <FileText className="h-10 w-10 text-orange-300" />
          <div>
            <p className="font-medium">Generate the full remediation plan</p>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              The scorecard is fast and deterministic. The report package turns the evidence into a PDF-friendly human
              report and a repo-ready agent remediation file.
            </p>
          </div>
          <Button onClick={onGenerateReport} disabled={disabled} className="bg-orange-500 text-black hover:bg-orange-400">
            Generate reports <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{report.title}</CardTitle>
          {isReportCached ? (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
              Cached report
            </Badge>
          ) : null}
        </div>
        <CardDescription>{report.executiveSummary}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="human" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="human">Executive Report</TabsTrigger>
            <TabsTrigger value="agent">Agent TXT</TabsTrigger>
          </TabsList>
          <TabsContent value="human" className="mt-4">
            <ReportMarkdown
              title="Human-readable remediation report"
              description="Doc-style report for technical, product, and DevRel teams."
              markdown={report.humanReportMarkdown}
              variant="human"
            />
          </TabsContent>
          <TabsContent value="agent" className="mt-4">
            <ReportMarkdown
              title="Agent-ready remediation TXT"
              description="Copy this into Cursor, Claude Code, or another coding agent so it knows what to fix and how."
              markdown={report.agentInstructionsMarkdown}
              variant="agent"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ReportMarkdown({
  title,
  description,
  markdown,
  variant,
}: {
  title: string;
  description: string;
  markdown: string;
  variant: "human" | "agent";
}) {
  const [copied, setCopied] = useState(false);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadTxt() {
    const blob = new Blob([markdown], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenameFromTitle(title)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadPdf() {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=1200");

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(buildPrintableReportHtml(title, markdown));
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {variant === "human" ? (
            <Button variant="outline" size="sm" onClick={downloadPdf}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={copyMarkdown}>
                <Copy className="mr-2 h-4 w-4" />
                {copied ? "Copied" : "Copy TXT"}
              </Button>
              <Button variant="outline" size="sm" onClick={downloadTxt}>
                <Download className="mr-2 h-4 w-4" />
                Download .txt
              </Button>
            </>
          )}
        </div>
      </div>
      <ScrollArea
        className={
          variant === "human"
            ? "h-[640px] rounded-xl border border-border bg-zinc-50 p-0 text-zinc-950"
            : "h-[640px] rounded-xl border border-border bg-black/30 p-4"
        }
      >
        {variant === "human" ? (
          <article className="mx-auto max-w-4xl space-y-4 px-6 py-8 leading-7 sm:px-10">
            <MarkdownDocument markdown={markdown} />
          </article>
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-zinc-200">{markdown}</pre>
        )}
      </ScrollArea>
    </div>
  );
}

function MarkdownDocument({ markdown }: { markdown: string }) {
  const blocks = parseMarkdownBlocks(markdown);

  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const HeadingTag = `h${Math.min(block.level, 3)}` as "h1" | "h2" | "h3";
          const className =
            block.level === 1
              ? "text-3xl font-semibold tracking-tight"
              : block.level === 2
                ? "pt-5 text-xl font-semibold"
                : "pt-3 text-base font-semibold";

          return (
            <HeadingTag key={index} className={className}>
              {block.text}
            </HeadingTag>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc space-y-2 pl-6 text-sm">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{stripMarkdownEmphasis(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "code") {
          return (
            <pre key={index} className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs leading-6 text-zinc-100">
              <code>{block.text}</code>
            </pre>
          );
        }

        return (
          <p key={index} className="text-sm text-zinc-800">
            {stripMarkdownEmphasis(block.text)}
          </p>
        );
      })}
    </>
  );
}

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; text: string };

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]?.trimEnd() ?? "";

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]?.startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push({ type: "code", text: codeLines.join("\n") });
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: stripMarkdownEmphasis(heading[2]) });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index]?.trimEnd() ?? "")) {
        items.push((lines[index] ?? "").replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index]?.trim() &&
      !lines[index]?.startsWith("#") &&
      !lines[index]?.startsWith("```") &&
      !/^[-*]\s+/.test(lines[index]?.trimEnd() ?? "")
    ) {
      paragraphLines.push(lines[index]?.trimEnd() ?? "");
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function stripMarkdownEmphasis(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1").replace(/`([^`]+)`/g, "$1");
}

function filenameFromTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildPrintableReportHtml(title: string, markdown: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { margin: 0.7in; }
      body { color: #18181b; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.65; }
      h1 { font-size: 28px; line-height: 1.2; margin: 0 0 18px; }
      h2 { border-top: 1px solid #e4e4e7; font-size: 18px; margin: 28px 0 10px; padding-top: 18px; }
      h3 { font-size: 14px; margin: 20px 0 8px; }
      p { margin: 0 0 10px; }
      ul { margin: 0 0 14px 20px; padding: 0; }
      li { margin: 0 0 6px; }
      pre { background: #18181b; border-radius: 10px; color: #fafafa; overflow-wrap: break-word; padding: 14px; white-space: pre-wrap; }
    </style>
  </head>
  <body>${markdownToHtml(markdown)}</body>
</html>`;
}

function markdownToHtml(markdown: string) {
  return parseMarkdownBlocks(markdown)
    .map((block) => {
      if (block.type === "heading") {
        const level = Math.min(block.level, 3);
        return `<h${level}>${escapeHtml(block.text)}</h${level}>`;
      }
      if (block.type === "list") {
        return `<ul>${block.items.map((item) => `<li>${escapeHtml(stripMarkdownEmphasis(item))}</li>`).join("")}</ul>`;
      }
      if (block.type === "code") {
        return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
      }
      return `<p>${escapeHtml(stripMarkdownEmphasis(block.text))}</p>`;
    })
    .join("\n");
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildLockedPreviewAudit(inputUrl: string): AuditResult {
  const normalizedUrl = normalizePreviewUrl(inputUrl);
  const checks = [
    {
      id: "locked-agent-entrypoint",
      label: "Agent entrypoint analysis",
      description: "Sign in to unlock the real cached score and evidence.",
      status: "warn" as const,
      weight: 16,
      evidence: "Locked preview",
      fix: "Unlock the stored audit with Google sign-in.",
    },
    {
      id: "locked-onboarding",
      label: "Developer onboarding analysis",
      description: "The real scan checks quickstarts, auth docs, response examples, and error handling.",
      status: "warn" as const,
      weight: 16,
      evidence: "Locked preview",
      fix: "Unlock to view page-level evidence.",
    },
  ];

  const categories: AuditCategory[] = [
    {
      id: "agentReadiness",
      title: "Agent Readiness",
      description: "Can an AI agent crawl, understand, and use the docs?",
      score: 64,
      checks,
    },
    {
      id: "developerOnboarding",
      title: "Developer Onboarding",
      description: "Can a developer reach a working first request quickly?",
      score: 58,
      checks,
    },
    {
      id: "apiSdkCoverage",
      title: "API & SDK Coverage",
      description: "Are endpoints, SDKs, examples, and lifecycle details complete?",
      score: 61,
      checks,
    },
    {
      id: "contentDemos",
      title: "Content & Demos",
      description: "Are there tutorials, videos, cookbooks, and examples that teach?",
      score: 52,
      checks,
    },
    {
      id: "trustCommunity",
      title: "Trust & Community",
      description: "Can developers verify reliability, support, and community health?",
      score: 67,
      checks,
    },
    {
      id: "llmDiscoverability",
      title: "LLM Discoverability",
      description: "Is the platform surfaced clearly to search engines and LLMs?",
      score: 49,
      checks,
    },
  ];

  return {
    url: inputUrl,
    normalizedUrl,
    scannedAt: new Date().toISOString(),
    overallScore: 58,
    summary: {
      strengths: ["Cached scan may exist", "Google sign-in unlocks real evidence"],
      risks: ["Anonymous previews are intentionally blurred"],
      criticalMissing: ["Sign in to view real findings"],
    },
    categories,
    pages: [
      {
        url: normalizedUrl,
        title: "Locked page evidence",
        markdown: "Sign in to unlock the stored scan data.",
        links: [],
      },
    ],
    assets: [
      {
        type: "docs",
        label: "Locked docs evidence",
        url: normalizedUrl,
      },
    ],
    stats: {
      discoveredUrls: 24,
      scannedPages: 8,
      externalLinks: 12,
      codeBlocks: 6,
      estimatedTokensSaved: 18000,
    },
  };
}

function normalizePreviewUrl(inputUrl: string) {
  try {
    const withProtocol = inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`;
    return new URL(withProtocol).origin;
  } catch {
    return "https://example.com";
  }
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "pass") return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />;
  if (status === "warn") return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />;
  return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />;
}
