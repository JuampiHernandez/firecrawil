"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  Flame,
  Loader2,
  Radar,
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
import type { AuditCategory, AuditCheck, AuditReport, AuditResult, CheckStatus } from "@/lib/audit/types";

const examples = ["https://www.firecrawl.dev", "https://supabase.com", "https://vercel.com", "https://stripe.com"];

const scanSteps = [
  "Mapping public URLs",
  "Scraping docs and product pages",
  "Finding demos, socials, SDKs, trust pages",
  "Scoring agent and developer readiness",
];

export function AuditApp() {
  const [url, setUrl] = useState("https://www.firecrawl.dev");
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runScan(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError(null);
    setReport(null);
    setIsAuditing(true);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Audit failed.");
      }
      setAudit(payload);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Audit failed.");
    } finally {
      setIsAuditing(false);
    }
  }

  async function generateReport() {
    if (!audit) return;
    setError(null);
    setIsReporting(true);

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Report failed.");
      }
      setReport(payload);
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "Report failed.");
    } finally {
      setIsReporting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_32rem),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_24rem)]" />
      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
        <Header />

        <Card className="border-orange-500/20 bg-card/80 shadow-2xl shadow-orange-950/10 backdrop-blur">
          <CardContent className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div className="space-y-6">
              <Badge className="w-fit border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
                Firecrawl-powered docs intelligence
              </Badge>
              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                  Lighthouse for agent-ready developer platforms.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Scan a product website for docs quality, agent readability, SDK coverage, demos, trust assets,
                  socials, and LLM discoverability. Generate a remediation report when you need the full diagnosis.
                </p>
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
                  Audit site
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
        {audit ? <Results audit={audit} onGenerateReport={generateReport} isReporting={isReporting} report={report} /> : null}
      </section>
    </main>
  );
}

function Header() {
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
      <Badge variant="outline" className="hidden border-orange-500/30 text-orange-200 sm:inline-flex">
        MVP
      </Badge>
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
  isReporting,
  report,
}: {
  audit: AuditResult;
  onGenerateReport: () => void;
  isReporting: boolean;
  report: AuditReport | null;
}) {
  const checks = useMemo(() => audit.categories.flatMap((category) => category.checks), [audit]);
  const failingChecks = checks.filter((check) => check.status !== "pass");

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <Card className="bg-card/80">
          <CardHeader>
            <CardTitle>Overall Score</CardTitle>
            <CardDescription>{audit.normalizedUrl}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <ScoreRing score={audit.overallScore} />
            <div className="grid w-full grid-cols-3 gap-3">
              <MiniMetric label="Links" value={audit.stats.discoveredUrls} />
              <MiniMetric label="Scanned" value={audit.stats.scannedPages} />
              <MiniMetric label="Issues" value={failingChecks.length} />
            </div>
            <Button onClick={onGenerateReport} disabled={isReporting} className="w-full bg-orange-500 text-black hover:bg-orange-400">
              {isReporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate remediation report
            </Button>
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
          <ReportPanel report={report} isReporting={isReporting} onGenerateReport={onGenerateReport} />
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
        <CardDescription>The report generator expands these into a prioritized remediation plan.</CardDescription>
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
}: {
  report: AuditReport | null;
  isReporting: boolean;
  onGenerateReport: () => void;
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
              The scorecard is fast and deterministic. The report turns the evidence into exact fixes, CTAs, and an
              llms.txt draft.
            </p>
          </div>
          <Button onClick={onGenerateReport} className="bg-orange-500 text-black hover:bg-orange-400">
            Generate report <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80">
      <CardHeader>
        <CardTitle>{report.title}</CardTitle>
        <CardDescription>{report.executiveSummary}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[520px] rounded-xl border border-border bg-black/30 p-4">
          <pre className="whitespace-pre-wrap font-mono text-xs leading-6 text-zinc-200">{report.rawMarkdown}</pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "pass") return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />;
  if (status === "warn") return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />;
  return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />;
}
