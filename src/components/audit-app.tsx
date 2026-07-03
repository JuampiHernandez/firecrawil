"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  Code2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Globe2,
  History,
  Lock,
  LogIn,
  LogOut,
  Loader2,
  Mail,
  PackagePlus,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  User,
  XCircle,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
import { RadarPulse } from "@/components/landing-effects";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const creditPacks = [
  {
    id: "starter",
    name: "Starter",
    credits: 2,
    price: "$1",
    description: "Run two fresh audits when you need a quick check.",
    featured: false,
  },
  {
    id: "growth",
    name: "Growth",
    credits: 10,
    price: "$3",
    description: "Compare more docs sites and keep a few rescans ready.",
    featured: true,
  },
] as const;

const customCreditsEmail = "juampi@juampi.dev";

const scanOutputs = [
  { title: "Ranked issues", detail: "Severity, impact, and evidence" },
  { title: "Readiness score", detail: "Agent, API, LLM, and trust signals" },
  { title: "Source-backed proof", detail: "Exact pages, assets, and gaps" },
  { title: "Fix plan", detail: "Repo-ready remediation tasks" },
];

const signupBenefits = [
  "2 free fresh-scan credits to start",
  "Stored results you can revisit anytime",
  "Downloadable PDF and agent-ready reports",
  "Track score changes across rescans",
];

type CurrentUser = {
  email: string;
  name?: string;
};

type PastScan = {
  id: string;
  url: string;
  score: number;
  scannedAt: string;
};

type AccountCredits = {
  used: number;
  granted: number;
};

export function AuditApp({
  user,
  isPaid,
  isSupabaseConfigured,
  pastScans,
  credits,
}: {
  user: CurrentUser | null;
  isPaid: boolean;
  isSupabaseConfigured: boolean;
  pastScans: PastScan[];
  credits: AccountCredits;
}) {
  const [url, setUrl] = useState("");
  const [auditId, setAuditId] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [isReportCached, setIsReportCached] = useState(false);
  const [isLockedPreview, setIsLockedPreview] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [checkoutPackId, setCheckoutPackId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [accountCredits, setAccountCredits] = useState(credits);
  const [error, setError] = useState<string | null>(null);
  const pendingScanStartedRef = useRef(false);
  const creditsRemaining = Math.max(0, accountCredits.granted - accountCredits.used);

  async function runScan(event?: FormEvent<HTMLFormElement>, scanUrl = url) {
    event?.preventDefault();
    setUrl(scanUrl);
    setError(null);
    setReport(null);
    setIsReportCached(false);

    if (!user) {
      setIsAuditing(true);
      setAudit(null);
      setAuditId(null);
      setIsCached(false);
      setIsLockedPreview(false);
      window.sessionStorage.setItem("docscanner:pending-url", scanUrl);
      await new Promise((resolve) => setTimeout(resolve, 1600));
      setAudit(buildLockedPreviewAudit(scanUrl));
      setIsLockedPreview(true);
      setIsAuditing(false);
      return;
    }

    setIsAuditing(true);

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scanUrl }),
      });
      const payload = (await response.json()) as AuditApiResponse & { error?: string; code?: string };
      if (!response.ok) {
        if (payload.code === "credits_required") {
          setIsCreditsModalOpen(true);
        }
        throw new Error(payload.error ?? "Audit failed.");
      }
      setAudit(payload.audit);
      setAuditId(payload.auditId);
      setIsCached(payload.cached);
      if (payload.credits) {
        setAccountCredits({
          used: payload.credits.used,
          granted: payload.credits.granted,
        });
      }
      setIsLockedPreview(false);
    } catch (scanError) {
      const message = scanError instanceof Error ? scanError.message : "Audit failed.";
      if (message.toLowerCase().includes("credits")) {
        setIsCreditsModalOpen(true);
      }
      setError(message);
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
    if (!user) return;
    if (creditsRemaining < 1) {
      setIsCreditsModalOpen(true);
      return;
    }
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
      const payload = (await response.json()) as AuditApiResponse & { error?: string; code?: string };
      if (!response.ok) {
        if (payload.code === "credits_required") {
          setIsCreditsModalOpen(true);
        }
        throw new Error(payload.error ?? "Audit failed.");
      }
      setAudit(payload.audit);
      setAuditId(payload.auditId);
      setIsCached(payload.cached);
      if (payload.credits) {
        setAccountCredits({
          used: payload.credits.used,
          granted: payload.credits.granted,
        });
      }
      setIsLockedPreview(false);
    } catch (scanError) {
      const message = scanError instanceof Error ? scanError.message : "Audit failed.";
      if (message.toLowerCase().includes("credits")) {
        setIsCreditsModalOpen(true);
      }
      setError(message);
    } finally {
      setIsAuditing(false);
    }
  }

  async function buyCredits(packId: string) {
    if (!user) {
      await signInWithGoogle();
      return;
    }

    setError(null);
    setCheckoutError(null);
    setCheckoutPackId(packId);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Could not create checkout.");
      }

      window.location.assign(payload.url);
    } catch (checkoutError) {
      const message = checkoutError instanceof Error ? checkoutError.message : "Could not create checkout.";
      setError(message);
      setCheckoutError(message);
      setCheckoutPackId(null);
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
        redirectTo: `${window.location.origin}/auth/callback?next=/app`,
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

  async function loadPastScan(scanUrl: string) {
    setUrl(scanUrl);
    await runScan(undefined, scanUrl);
  }

  useEffect(() => {
    if (!user || pendingScanStartedRef.current) return;

    const pendingUrl = window.sessionStorage.getItem("docscanner:pending-url");
    if (!pendingUrl) return;

    pendingScanStartedRef.current = true;
    window.sessionStorage.removeItem("docscanner:pending-url");
    const timeoutId = window.setTimeout(() => {
      void runScan(undefined, pendingUrl);
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // Run only once after auth returns; runScan intentionally stays out of deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const displayName = getDisplayName(user);

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_2%,rgba(255,106,0,0.2),transparent_28rem),radial-gradient(circle_at_86%_10%,rgba(255,176,32,0.14),transparent_24rem),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_18rem)]" />
      <RadarPulse className="fixed right-8 top-6 hidden h-72 w-72 lg:block" />
      <div className="relative mx-auto flex w-full max-w-[94rem] flex-col gap-3 px-4 py-4 sm:gap-5 sm:px-6 lg:min-h-screen lg:flex-row lg:gap-6 lg:p-6 xl:gap-8 xl:p-8 3xl:max-w-[110rem] 3xl:gap-10 3xl:p-10">
        <Sidebar
          user={user}
          isPaid={isPaid}
          pastScans={pastScans}
          credits={accountCredits}
          onSignIn={signInWithGoogle}
          onSignOut={signOut}
          onSelectPastScan={loadPastScan}
          onAddCredits={() => setIsCreditsModalOpen(true)}
        />

        <section className="flex min-w-0 flex-1 flex-col gap-5 lg:gap-6 xl:gap-7">
          <Card className="rounded-2xl border-white/10 bg-[#111317]/85 shadow-2xl shadow-black/30 backdrop-blur sm:rounded-3xl">
            <CardContent className="grid gap-5 p-4 sm:gap-6 sm:p-6 lg:p-8 xl:p-10 min-[1400px]:grid-cols-[0.9fr_1.1fr] min-[1400px]:gap-10 2xl:p-12 3xl:p-14">
              <div className="relative space-y-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:space-y-6 sm:p-0 sm:border-0 sm:bg-transparent lg:space-y-7">
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl sm:hidden" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="w-fit border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10 lg:px-3 lg:py-1 lg:text-sm">
                    {user ? "Ready to scan" : "Scan before sign-up"}
                  </Badge>
                  <Badge variant="outline" className="hidden border-white/10 bg-white/[0.03] text-muted-foreground sm:inline-flex lg:px-3 lg:py-1 lg:text-sm">
                    Scan. Score. Improve.
                  </Badge>
                </div>
                <div className="max-w-3xl space-y-3 sm:space-y-4 lg:space-y-5">
                  <h1 className="text-4xl font-semibold leading-[0.95] tracking-[-0.055em] text-balance sm:text-5xl lg:text-6xl 2xl:text-7xl 3xl:text-8xl">
                    The Lighthouse for <span className="text-orange-400">Developer Docs.</span>
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-lg sm:leading-7 lg:text-xl lg:leading-8 3xl:max-w-3xl 3xl:text-2xl">
                    {user
                      ? "Paste your docs URL and run a fresh audit for missing specs, stale examples, and agent blockers."
                      : "Paste your docs URL. We will start the scan, then ask you to sign in before showing the full results."}
                  </p>
                  {!user ? null : creditsRemaining < 1 ? (
                    <p className="max-w-2xl text-sm text-orange-200 lg:text-base">
                      Signed in as {displayName}. You are out of fresh scan credits. Stored scans still load for free.
                    </p>
                  ) : (
                    <p className="max-w-2xl text-sm text-orange-200 lg:text-base">
                      Signed in as {displayName}. You have {creditsRemaining} fresh scan {creditsRemaining === 1 ? "credit" : "credits"} ready.
                    </p>
                  )}
                </div>

                <form onSubmit={runScan} className="relative rounded-2xl border border-white/10 bg-black/25 p-2 shadow-inner shadow-black/30 lg:p-2.5">
                  <div className="flex flex-col gap-2 sm:flex-row lg:gap-3">
                    <div className="relative flex-1">
                      <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground lg:h-5 lg:w-5" />
                      <Input
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        placeholder="https://docs.example.com"
                        required
                        className="h-11 border-white/10 bg-[#0b0c0e]/80 pl-9 font-mono text-sm sm:h-12 lg:h-14 lg:pl-11 lg:text-base"
                      />
                    </div>
                    <Button type="submit" size="lg" disabled={isAuditing} className="h-11 bg-orange-500 px-5 text-black hover:bg-orange-400 sm:h-12 lg:h-14 lg:px-7 lg:text-base">
                      {isAuditing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radar className="mr-2 h-4 w-4" />}
                      {user ? "Run scan" : "Scan my docs"}
                    </Button>
                  </div>
                </form>

                {!user ? (
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground sm:hidden">
                    {["Crawl docs", "Find blockers", "Unlock report"].map((label) => (
                      <div key={label} className="rounded-xl border border-white/10 bg-white/[0.035] px-2 py-2">
                        {label}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <ScanPanel audit={audit} isAuditing={isAuditing} className={user ? "" : "hidden min-[1400px]:block"} />
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
          {user ? (
            <PricingSection
              user={user}
              creditsRemaining={creditsRemaining}
              onSignIn={signInWithGoogle}
              onBuyCredits={buyCredits}
              checkoutPackId={checkoutPackId}
              onOpenCredits={() => setIsCreditsModalOpen(true)}
            />
          ) : null}
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
              canRescan={creditsRemaining > 0}
              onSignIn={signInWithGoogle}
              onAddCredits={() => setIsCreditsModalOpen(true)}
            />
          ) : null}
        </section>
      </div>
      <CreditsModal
        open={isCreditsModalOpen}
        user={user}
        credits={accountCredits}
        onClose={() => {
          setIsCreditsModalOpen(false);
          setCheckoutError(null);
        }}
        onSignIn={signInWithGoogle}
        onBuyCredits={buyCredits}
        checkoutPackId={checkoutPackId}
        checkoutError={checkoutError}
      />
    </main>
  );
}

function formatScanHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatScanDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function getDisplayName(user: CurrentUser | null) {
  if (!user) return "Guest";
  return user.name?.trim() || user.email.split("@")[0] || "Signed in";
}

function Sidebar({
  user,
  isPaid,
  pastScans,
  credits,
  onSignIn,
  onSignOut,
  onSelectPastScan,
  onAddCredits,
}: {
  user: CurrentUser | null;
  isPaid: boolean;
  pastScans: PastScan[];
  credits: AccountCredits;
  onSignIn: () => void;
  onSignOut: () => void;
  onSelectPastScan: (url: string) => void;
  onAddCredits: () => void;
}) {
  const [pastScansOpen, setPastScansOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const creditsRemaining = Math.max(0, credits.granted - credits.used);
  const displayName = getDisplayName(user);

  return (
    <>
    <aside className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0f1115]/88 p-3 shadow-2xl shadow-black/25 backdrop-blur lg:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <DocScannerMark className="h-9 w-9 rounded-xl" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-[-0.03em]">DocScanner</p>
          {user ? (
            <p className="truncate text-xs text-orange-200">{displayName}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Create a free account</p>
          )}
        </div>
      </div>
      {user ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onAddCredits}
            className="rounded-full border border-orange-500/25 bg-orange-500/10 px-3 py-1.5 text-xs text-orange-100"
          >
            {creditsRemaining}/{credits.granted} credits
          </button>
          <Button variant="outline" size="sm" onClick={onSignOut} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={onSignIn} className="shrink-0 bg-orange-500 text-black hover:bg-orange-400">
          Sign up
        </Button>
      )}
    </aside>

    <aside className="hidden shrink-0 flex-col justify-between gap-6 rounded-3xl border border-white/10 bg-[#0f1115]/80 p-4 shadow-2xl shadow-black/30 backdrop-blur lg:sticky lg:top-6 lg:flex lg:w-64 lg:self-stretch xl:w-72 xl:p-5 2xl:w-80 2xl:p-6 3xl:w-96">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <DocScannerMark className="h-11 w-11 xl:h-12 xl:w-12" />
          <div>
            <p className="text-xl font-semibold tracking-[-0.03em] xl:text-2xl">DocScanner</p>
            <p className="text-xs text-orange-200 xl:text-sm">{user ? displayName : "Sign up to try it"}</p>
          </div>
        </div>

        {user ? (
          <nav className="grid gap-1">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2.5 text-sm text-orange-100">
              <span className="flex min-w-0 items-center gap-3">
                <Gauge className="h-4 w-4 shrink-0" />
                <span className="truncate">Credits</span>
              </span>
              <span className="shrink-0 text-xs text-orange-200">
                {creditsRemaining}/{credits.granted}
              </span>
            </div>
            <Button size="sm" onClick={onAddCredits} className="bg-orange-500 text-black hover:bg-orange-400">
              <PackagePlus className="mr-2 h-4 w-4" />
              Add credits
            </Button>

            <button
              type="button"
              onClick={() => setPastScansOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
            >
              <span className="flex items-center gap-3">
                <History className="h-4 w-4" />
                Past scans
              </span>
              <ChevronDown className={`h-4 w-4 transition ${pastScansOpen ? "rotate-180" : ""}`} />
            </button>
            {pastScansOpen ? (
              <div className="grid gap-1 pl-2">
                {pastScans.length > 0 ? (
                  pastScans.map((scan) => (
                    <button
                      key={scan.id}
                      type="button"
                      onClick={() => onSelectPastScan(scan.url)}
                      className="min-w-0 rounded-xl border border-transparent px-3 py-2 text-left transition hover:border-white/10 hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm">{formatScanHost(scan.url)}</p>
                        <span className="shrink-0 text-xs text-orange-200">{scan.score}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatScanDate(scan.scannedAt)}</p>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-1 text-xs text-muted-foreground">No scans yet. Run your first audit above.</p>
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
            >
              <span className="flex min-w-0 items-center gap-3">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">Profile</span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition ${profileOpen ? "rotate-180" : ""}`} />
            </button>
            {profileOpen ? (
              <div className="min-w-0 space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.name ?? "Signed in"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <p className="text-xs text-muted-foreground">{isPaid ? "Paid account" : "Free account"}</p>
                <button
                  type="button"
                  onClick={onAddCredits}
                  className="w-full rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-left text-xs text-orange-100 transition hover:border-orange-500/40 hover:bg-orange-500/15"
                >
                  {creditsRemaining} credits left. Manage credits
                </button>
                <Button variant="outline" size="sm" onClick={onSignOut} className="w-full">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </div>
            ) : null}
          </nav>
        ) : (
          <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.07] p-3 xl:p-4">
            <p className="text-sm font-medium text-orange-100 xl:text-base">Try a real docs scan</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground xl:text-sm">
              Enter a website first. Sign in after the preview to unlock saved results and reports.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-3 xl:p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground xl:text-xs">What you unlock</p>
          <div className="mt-3 grid gap-2 xl:gap-2.5">
            {signupBenefits.map((item) => (
              <div key={item} className="flex gap-2 text-xs leading-5 text-muted-foreground xl:text-sm">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {!user ? (
          <Button
            onClick={onSignIn}
            className="h-10 w-full rounded-xl bg-orange-500 text-sm text-black transition-transform duration-200 hover:scale-[1.02] hover:bg-orange-400 active:scale-[0.98]"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Log in
          </Button>
        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          Made by{" "}
          <a
            href="https://x.com/juampitech"
            target="_blank"
            rel="noreferrer"
            className="text-orange-200 underline-offset-4 transition hover:text-orange-100 hover:underline"
          >
            juampi
          </a>
        </p>
      </div>
    </aside>
    </>
  );
}

function PricingSection({
  user,
  creditsRemaining,
  onSignIn,
  onBuyCredits,
  checkoutPackId,
  onOpenCredits,
}: {
  user: CurrentUser | null;
  creditsRemaining: number;
  onSignIn: () => void;
  onBuyCredits: (packId: string) => void;
  checkoutPackId: string | null;
  onOpenCredits: () => void;
}) {
  return (
    <Card className="border-white/10 bg-[#111317]/85 shadow-xl shadow-black/20">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge className="mb-3 w-fit border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
              Pay as you scan
            </Badge>
            <CardTitle className="text-2xl tracking-[-0.03em]">Add scan credits when you need them</CardTitle>
            <CardDescription>
              Free accounts start with 2 fresh scans. Stored scans never consume credits.
            </CardDescription>
          </div>
          {user ? (
            <Button variant="outline" onClick={onOpenCredits} className="border-orange-500/30 text-orange-200">
              <User className="mr-2 h-4 w-4" />
              {creditsRemaining} credits left
            </Button>
          ) : (
            <Button onClick={onSignIn} className="bg-orange-500 text-black hover:bg-orange-400">
              <LogIn className="mr-2 h-4 w-4" />
              Sign in to buy
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        {creditPacks.map((pack) => (
          <CreditPackCard
            key={pack.id}
            pack={pack}
            onBuyCredits={onBuyCredits}
            checkoutPackId={checkoutPackId}
            disabled={!user}
          />
        ))}
        <Card className="border-white/10 bg-black/20">
          <CardHeader>
            <div className="mb-2 grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <Mail className="h-5 w-5 text-orange-300" />
            </div>
            <CardTitle>Custom</CardTitle>
            <CardDescription>Need a bigger batch or want a manual arrangement?</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full border-orange-500/30 text-orange-200">
              <a href={`mailto:${customCreditsEmail}?subject=Custom DocScanner credits`}>
                Contact juampi <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

function CreditPackCard({
  pack,
  onBuyCredits,
  checkoutPackId,
  disabled,
}: {
  pack: (typeof creditPacks)[number];
  onBuyCredits: (packId: string) => void;
  checkoutPackId: string | null;
  disabled?: boolean;
}) {
  const isLoading = checkoutPackId === pack.id;

  return (
    <Card className={`relative h-full overflow-hidden bg-black/20 ${pack.featured ? "border-orange-500/35" : "border-white/10"}`}>
      {pack.featured ? (
        <div className="absolute right-4 top-4 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs text-orange-200">
          Best value
        </div>
      ) : null}
      <CardHeader>
        <div className="mb-2 grid h-10 w-10 place-items-center rounded-2xl border border-orange-500/25 bg-orange-500/10">
          <CreditCard className="h-5 w-5 text-orange-300" />
        </div>
        <CardTitle>{pack.name}</CardTitle>
        <CardDescription className="min-h-10">{pack.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-3xl font-semibold tracking-[-0.04em]">{pack.price}</p>
          <p className="text-sm text-muted-foreground">{pack.credits} fresh scan credits</p>
        </div>
        <Button
          onClick={() => onBuyCredits(pack.id)}
          disabled={disabled || Boolean(checkoutPackId)}
          className="w-full justify-center bg-orange-500 text-black hover:bg-orange-400"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
          {disabled ? "Sign in first" : "Buy credits"}
        </Button>
      </CardContent>
    </Card>
  );
}

function CreditsModal({
  open,
  user,
  credits,
  onClose,
  onSignIn,
  onBuyCredits,
  checkoutPackId,
  checkoutError,
}: {
  open: boolean;
  user: CurrentUser | null;
  credits: AccountCredits;
  onClose: () => void;
  onSignIn: () => void;
  onBuyCredits: (packId: string) => void;
  checkoutPackId: string | null;
  checkoutError: string | null;
}) {
  if (!open) return null;

  const creditsRemaining = Math.max(0, credits.granted - credits.used);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-md sm:py-10">
      <Card className="relative w-full max-w-2xl border-orange-500/25 bg-[#111317] shadow-2xl shadow-black/50">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/[0.03] p-2 text-muted-foreground transition hover:text-foreground"
          aria-label="Close credits modal"
        >
          <XCircle className="h-4 w-4" />
        </button>
        <CardHeader className="pr-14">
          <Badge className="mb-3 w-fit border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
            Account credits
          </Badge>
          <CardTitle className="text-2xl tracking-[-0.04em]">Your scan balance</CardTitle>
          <CardDescription>
            Add credits with Lemon Squeezy. Card details stay with Lemon Squeezy, not DocScanner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.name ?? "Not signed in"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email ?? "Sign in with Google to buy credits."}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <CreditStat label="Left" value={creditsRemaining} />
              <CreditStat label="Used" value={credits.used} />
              <CreditStat label="Total" value={credits.granted} />
            </div>
          </div>

          {!user ? (
            <Button onClick={onSignIn} className="w-full justify-center bg-orange-500 text-black hover:bg-orange-400">
              <LogIn className="h-4 w-4" />
              Sign in with Google
            </Button>
          ) : null}

          {checkoutError ? (
            <Alert className="border-red-500/30 bg-red-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Checkout issue</AlertTitle>
              <AlertDescription>{checkoutError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {creditPacks.map((pack) => (
              <CreditPackCard
                key={pack.id}
                pack={pack}
                onBuyCredits={onBuyCredits}
                checkoutPackId={checkoutPackId}
                disabled={!user}
              />
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-center sm:text-left">
                <p className="font-medium">Need a custom credit bundle?</p>
                <p className="text-sm text-muted-foreground">
                  Email me your account and use case for a manual bundle.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full justify-center border-orange-500/30 text-orange-200 sm:w-auto">
                <a href={`mailto:${customCreditsEmail}?subject=Custom DocScanner credits`}>
                  {customCreditsEmail}
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreditStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="font-mono text-lg text-orange-200">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function DocScannerMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <div className={`relative grid place-items-center rounded-2xl border border-orange-500/25 bg-orange-500/10 ${className}`}>
      <span className="absolute h-7 w-7 rounded-full border-2 border-orange-500/90 border-r-transparent" />
      <span className="absolute h-4 w-4 rounded-full border-2 border-orange-300/80 border-b-transparent" />
      <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-[0_0_22px_rgba(255,106,0,0.95)]" />
      <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-orange-300" />
    </div>
  );
}

function ScanPanel({ audit, isAuditing, className }: { audit: AuditResult | null; isAuditing: boolean; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c0e]/70 p-4 shadow-inner shadow-black/30 sm:rounded-3xl sm:p-5 lg:p-7", className)}>
      <RadarPulse className="absolute -right-14 -top-14 h-44 w-44" />
      <div className="relative mb-5 flex items-center justify-between lg:mb-6">
        <div>
          <p className="text-sm font-medium lg:text-base">What you get</p>
          <p className="text-xs text-muted-foreground lg:text-sm">Audit output in one run</p>
        </div>
        <Activity className="h-4 w-4 text-orange-300 lg:h-5 lg:w-5" />
      </div>
      <div className="relative space-y-3 lg:space-y-4">
        {scanOutputs.map((output, index) => (
          <div
            key={output.title}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3 sm:rounded-2xl sm:py-3.5 lg:gap-4 lg:px-4 lg:py-4"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-500/25 bg-orange-500/10 text-xs text-orange-300 lg:h-9 lg:w-9 lg:text-sm">
              {isAuditing ? <span className="animate-pulse">{index + 1}</span> : <CheckCircle2 className="h-4 w-4 lg:h-4.5 lg:w-4.5" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium lg:text-base">{output.title}</p>
              <p className="truncate text-xs text-muted-foreground lg:text-sm">{output.detail}</p>
            </div>
          </div>
        ))}
      </div>
      {audit ? (
        <div className="relative mt-4 grid grid-cols-3 gap-2 sm:mt-5 sm:gap-3 lg:mt-6 lg:gap-4">
          <MiniMetric label="Links" value={audit.stats.discoveredUrls} icon={Search} />
          <MiniMetric label="Scanned" value={audit.stats.scannedPages} icon={FileText} />
          <MiniMetric label="Assets" value={audit.assets.length} icon={Sparkles} />
        </div>
      ) : null}
    </div>
  );
}

function MiniMetric({ label, value, icon: Icon }: { label: string; value: number; icon?: typeof Activity }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111317]/80 p-2.5 sm:rounded-2xl sm:p-3 lg:p-4">
      {Icon ? <Icon className="mb-2 h-3.5 w-3.5 text-orange-300 lg:h-4 lg:w-4" /> : null}
      <p className="font-mono text-base sm:text-lg lg:text-xl">{value}</p>
      <p className="text-xs text-muted-foreground lg:text-sm">{label}</p>
    </div>
  );
}

function LoadingScorecard() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="border-white/10 bg-[#111317]/80">
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
  canRescan,
  onSignIn,
  onAddCredits,
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
  canRescan: boolean;
  onSignIn: () => void;
  onAddCredits: () => void;
}) {
  const checks = useMemo(() => audit.categories.flatMap((category) => category.checks), [audit]);
  const failingChecks = checks.filter((check) => check.status !== "pass");
  const statusCounts = useMemo(
    () => ({
      pass: checks.filter((check) => check.status === "pass").length,
      warn: checks.filter((check) => check.status === "warn").length,
      fail: checks.filter((check) => check.status === "fail").length,
    }),
    [checks]
  );
  const [activeTab, setActiveTab] = useState("issues");
  const reportSectionRef = useRef<HTMLDivElement>(null);

  function openReportTab() {
    setActiveTab("report");
    requestAnimationFrame(() => {
      reportSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="relative space-y-6">
      {isLockedPreview ? <LockedPreviewOverlay onSignIn={onSignIn} /> : null}
      <div className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
        <Card className="border-white/10 bg-[#111317]/85 shadow-xl shadow-black/20">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Overall Score</CardTitle>
                <CardDescription>{audit.normalizedUrl}</CardDescription>
              </div>
              {isCached ? (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
                  Stored scan
                </Badge>
              ) : isLockedPreview ? (
                <Badge variant="outline" className="border-orange-500/30 text-orange-200">
                  Locked preview
                </Badge>
              ) : (
                <Badge variant="outline">Fresh scan</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5 p-5">
            <ScoreRing score={audit.overallScore} />
            <div className="grid w-full grid-cols-3 gap-3">
              <MiniMetric label="Links" value={audit.stats.discoveredUrls} icon={Globe2} />
              <MiniMetric label="Scanned" value={audit.stats.scannedPages} icon={FileText} />
              <MiniMetric label="Issues" value={failingChecks.length} icon={AlertTriangle} />
            </div>
            <div className="grid w-full grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
              <StatusPill status="pass" value={statusCounts.pass} />
              <StatusPill status="warn" value={statusCounts.warn} />
              <StatusPill status="fail" value={statusCounts.fail} />
            </div>
            <Button
              onClick={openReportTab}
              disabled={isLockedPreview || !user}
              className="w-full bg-orange-500 text-black hover:bg-orange-400"
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate remediation package
            </Button>
            {user ? (
              <Button variant="outline" onClick={onRescan} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                {canRescan ? "Run fresh rescan" : "Add credits to rescan"}
              </Button>
            ) : null}
            {user && !canRescan ? (
              <Button variant="outline" onClick={onAddCredits} className="w-full border-orange-500/30 text-orange-200">
                <PackagePlus className="mr-2 h-4 w-4" />
                Buy scan credits
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

      <div ref={reportSectionRef}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 border border-white/10 bg-[#111317]/80">
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
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative grid h-36 w-36 place-items-center sm:h-44 sm:w-44">
      <div className="absolute inset-3 rounded-full bg-[radial-gradient(circle,rgba(255,106,0,0.18),transparent_58%)]" />
      <svg viewBox="0 0 176 176" className="h-36 w-36 -rotate-90 sm:h-44 sm:w-44">
        <circle cx="88" cy="88" r="54" stroke="currentColor" strokeWidth="10" fill="none" className="text-white/10" />
        <circle
          cx="88"
          cy="88"
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
        <p className="font-mono text-3xl font-semibold sm:text-4xl">{score}</p>
        <p className="text-xs text-muted-foreground">/ 100</p>
      </div>
    </div>
  );
}

function StatusPill({ status, value }: { status: CheckStatus; value: number }) {
  const styles = {
    pass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    warn: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    fail: "border-red-500/25 bg-red-500/10 text-red-300",
  } satisfies Record<CheckStatus, string>;

  return (
    <div className={`rounded-xl border px-2 py-2 text-center ${styles[status]}`}>
      <p className="font-mono text-base">{value}</p>
      <p className="text-[11px] capitalize opacity-80">{status}</p>
    </div>
  );
}

function LockedPreviewOverlay({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-start justify-center rounded-3xl bg-background/20 pt-24 backdrop-blur-sm">
      <Card className="mx-4 max-w-md border-orange-500/30 bg-[#111317]/95 shadow-2xl">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-orange-500/25 bg-orange-500/10">
            <Lock className="h-5 w-5 text-orange-300" />
          </div>
          <div>
            <p className="font-medium">Sign in to unlock the stored scan</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This preview did not call Firecrawl. Google sign-in unlocks stored results, and signed-in accounts can trigger fresh scans when credits are available.
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
    <Card className="border-white/10 bg-[#111317]/85 transition hover:border-orange-500/30 hover:bg-[#171a1f]">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-orange-500/20 bg-orange-500/10">
              <CategoryIcon categoryId={category.id} />
            </div>
            <CardTitle className="text-base">{category.title}</CardTitle>
          </div>
          <ScoreBadge score={category.score} />
        </div>
        <CardDescription>{category.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={category.score} className="h-2 bg-white/10 [&_[data-slot=progress-indicator]]:bg-orange-500" />
      </CardContent>
    </Card>
  );
}

function CategoryIcon({ categoryId }: { categoryId: string }) {
  const normalizedId = categoryId.toLowerCase();

  if (normalizedId.includes("agent")) return <Bot className="h-4 w-4 text-orange-300" />;
  if (normalizedId.includes("developer")) return <Code2 className="h-4 w-4 text-orange-300" />;
  if (normalizedId.includes("api")) return <Gauge className="h-4 w-4 text-orange-300" />;
  if (normalizedId.includes("content")) return <Sparkles className="h-4 w-4 text-orange-300" />;
  if (normalizedId.includes("trust")) return <ShieldCheck className="h-4 w-4 text-orange-300" />;
  return <Target className="h-4 w-4 text-orange-300" />;
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
    <Card className="border-white/10 bg-[#111317]/85">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Highest-Signal Gaps</CardTitle>
            <CardDescription>The report generator expands these into human-readable and agent-executable fixes.</CardDescription>
          </div>
          <Badge variant="outline" className="border-orange-500/30 text-orange-200">
            {checks.length} issues
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.length ? (
          checks.slice(0, 10).map((check, index) => (
            <div key={`${check.id}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-orange-500/25">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={check.status} />
                    <p className="font-medium">{check.label}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{check.description}</p>
                  {check.fix ? <p className="mt-3 text-sm text-orange-200">Fix: {check.fix}</p> : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge status={check.status} />
                  <Badge variant="outline">{check.weight} pts</Badge>
                </div>
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

function StatusBadge({ status }: { status: CheckStatus }) {
  const className =
    status === "pass"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : status === "warn"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-red-500/30 bg-red-500/10 text-red-300";

  return (
    <Badge variant="outline" className={className}>
      {status}
    </Badge>
  );
}

function AssetGrid({ audit }: { audit: AuditResult }) {
  return (
    <Card className="border-white/10 bg-[#111317]/85">
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
              className="group min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-orange-500/40"
            >
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary" className="bg-white/10">
                  {asset.type}
                </Badge>
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
    <Card className="border-white/10 bg-[#111317]/85">
      <CardHeader>
        <CardTitle>Checks</CardTitle>
        <CardDescription>Detailed results with evidence and remediation guidance.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category.id}>
              <div className="mb-3 flex items-center justify-between">
                <p className="font-medium">{category.title}</p>
                <ScoreBadge score={category.score} />
              </div>
              <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
                {category.checks.map((check) => (
                  <div key={check.id} className="grid gap-3 bg-black/20 p-4 md:grid-cols-[1fr_auto]">
                    <div className="flex gap-3">
                      <StatusIcon status={check.status} />
                      <div>
                        <p className="text-sm font-medium">{check.label}</p>
                        <p className="text-xs text-muted-foreground">{check.evidence ?? check.description}</p>
                      </div>
                    </div>
                    <StatusBadge status={check.status} />
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
      <Card className="border-white/10 bg-[#111317]/85">
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
      <Card className="border-white/10 bg-[#111317]/85">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-orange-500/25 bg-orange-500/10">
            <FileText className="h-6 w-6 text-orange-300" />
          </div>
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
    <Card className="border-white/10 bg-[#111317]/85">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{report.title}</CardTitle>
          {isReportCached ? (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
              Stored report
            </Badge>
          ) : null}
        </div>
        <CardDescription>{report.executiveSummary}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="human" className="w-full">
          <TabsList className="grid w-full grid-cols-2 border border-white/10 bg-black/20">
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
      description: "Sign in to unlock the real score and evidence.",
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
      strengths: ["A stored scan may exist", "Google sign-in unlocks real evidence"],
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
