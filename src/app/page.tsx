import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Code2,
  FileText,
  Gauge,
  Globe2,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { AmbientLandingEffects, RotatingSignal } from "@/components/landing-effects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const issueCards = [
  {
    icon: Code2,
    title: "No schema",
    text: "Agents cannot infer your API contract.",
  },
  {
    icon: Gauge,
    title: "First call friction",
    text: "Auth, base URL, and examples are scattered.",
  },
  {
    icon: ShieldCheck,
    title: "Weak trust",
    text: "No changelog, status, or security signals.",
  },
  {
    icon: Bot,
    title: "Stale examples",
    text: "Snippets drift from real API behavior.",
  },
];

const scoreCards = [
  ["Agent Readiness", 78, "Warn", Sparkles],
  ["Developer Onboarding", 77, "Warn", Code2],
  ["API and SDK Coverage", 86, "Pass", FileText],
  ["Content and Demos", 81, "Pass", Target],
  ["LLM Discoverability", 66, "Warn", Search],
  ["Trust and Community", 42, "Fail", ShieldCheck],
] satisfies Array<[string, number, string, LucideIcon]>;

const issueRows = [
  ["Missing OpenAPI / schema", "Fail", "No openapi.json or swagger.json found", "-9 pts"],
  ["Incomplete error responses", "Fail", "3/12 endpoints missing 4xx/5xx examples", "-6 pts"],
  ["Missing code example", "Warn", "8/20 endpoints missing cURL example", "-3 pts"],
  ["Status page not linked", "Pass", "Status page linked and reachable", "0 pts"],
];

const steps = [
  ["Crawl", "Docs, SDKs, examples, trust pages."],
  ["Score", "One score across the signals that matter."],
  ["Explain", "Evidence for every issue."],
  ["Fix", "A prioritized remediation plan."],
];

const pricing = [
  {
    name: "Free",
    price: "$0",
    description: "For individuals getting started.",
    cta: "Start for free",
    featured: false,
    features: ["5 scans per month", "Up to 25 pages per scan", "Remediation preview", "Export report (PDF)", "1 user"],
  },
  {
    name: "Pro",
    price: "$79",
    description: "For developers and small teams.",
    cta: "Start Pro trial",
    featured: true,
    features: ["100 scans per month", "Up to 500 pages per scan", "Full remediation reports", "Export PDF and CSV", "3 users included"],
  },
  {
    name: "Team",
    price: "Custom",
    description: "For growing engineering teams.",
    cta: "Contact sales",
    featured: false,
    features: ["Unlimited scans", "Unlimited pages per scan", "Full remediation reports", "Export PDF, CSV, and JSON", "Priority onboarding"],
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050607] text-foreground">
      <AmbientLandingEffects />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(255,106,0,0.18),transparent_28rem),radial-gradient(circle_at_76%_22%,rgba(255,106,0,0.12),transparent_26rem),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_20rem)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 py-5 sm:px-7 lg:px-8">
        <Header />
        <Hero />
        <ProblemSection />
        <IssuesSection />
        <ScoringSection />
        <ReportSection />
        <HowItWorksSection />
        <PricingSection />
        <FinalCta />
        <Footer />
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-4 z-20 flex items-center justify-between rounded-2xl border border-white/10 bg-[#090a0c]/80 px-3 py-3 shadow-2xl shadow-black/30 backdrop-blur">
      <Link href="/" className="flex items-center gap-3">
        <DocScannerMark />
        <span className="text-base font-semibold tracking-[-0.03em]">DocScanner</span>
      </Link>
      <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
        <a href="#product" className="transition hover:text-foreground">
          Product
        </a>
        <a href="#how-it-works" className="transition hover:text-foreground">
          How it works
        </a>
        <a href="#pricing" className="transition hover:text-foreground">
          Pricing
        </a>
      </nav>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" className="hidden text-muted-foreground sm:inline-flex">
          <Link href="/app">Sign in</Link>
        </Button>
        <Button asChild className="bg-orange-500 text-black hover:bg-orange-400">
          <Link href="/app">
            Start free scan <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="grid min-h-[calc(100vh-6rem)] items-center gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
      <div className="max-w-2xl space-y-7">
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          Developer docs lighthouse
        </Badge>
        <div className="space-y-5">
          <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.055em] text-balance sm:text-6xl lg:text-7xl">
            The Lighthouse for <span className="text-orange-400">Developer Docs.</span>
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Find broken docs paths, agent blockers, stale examples, and missing specs in one scan.
          </p>
          <RotatingSignal />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-12 rounded-xl bg-orange-500 px-6 text-black hover:bg-orange-400">
            <Link href="/app">
              Scan your docs <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-white/10 bg-white/[0.03] px-6">
            <Link href="/app">
              View sample report <FileText className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid max-w-xl grid-cols-3 gap-4 border-y border-white/10 py-5 text-sm">
          <Metric value="2,847" label="scans run" icon={Globe2} />
          <Metric value="1.21M+" label="links analyzed" icon={Radar} />
          <Metric value="8.63K+" label="reports generated" icon={FileText} />
        </div>
      </div>

      <ProductMockup />
    </section>
  );
}

function ProductMockup() {
  return (
    <div className="relative" id="product">
      <div className="absolute -inset-6 rounded-[2rem] bg-orange-500/15 blur-3xl" />
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d10]/95 p-4 shadow-2xl shadow-orange-950/30">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4" />
            docs.twilio.com
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300">Fresh scan</span>
          </div>
          <span>Scanned 2m ago</span>
        </div>
        <div className="grid gap-4 pt-4 lg:grid-cols-[0.36fr_0.64fr]">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <p className="text-sm font-medium">Overall Score</p>
            <div className="mt-5 grid place-items-center">
              <ScoreRing score={69} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center text-xs text-muted-foreground">
              <span>
                <strong className="block text-base text-foreground">80</strong> Links
              </span>
              <span>
                <strong className="block text-base text-foreground">14</strong> Issues
              </span>
              <span>
                <strong className="block text-base text-foreground">160</strong> Assets
              </span>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {scoreCards.slice(0, 6).map(([label, score, status, Icon]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span>{label}</span>
                    <Icon className="h-4 w-4 text-orange-300" />
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${score}%` }} />
                    </div>
                    <span className={status === "Pass" ? "text-emerald-300" : "text-orange-300"}>{score}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="mb-3 text-sm font-medium">Top issues</p>
              <div className="grid gap-2">
                {issueRows.slice(0, 3).map(([issue, status, evidence]) => (
                  <div key={issue} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                    <AlertTriangle className={status === "Fail" ? "h-4 w-4 text-red-400" : "h-4 w-4 text-orange-300"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{issue}</p>
                      <p className="truncate text-xs text-muted-foreground">{evidence}</p>
                    </div>
                    <span className="text-xs text-orange-200">High</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
          {["Crawl Complete", "Assets Found", "Report Ready"].map((label) => (
            <div key={label} className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProblemSection() {
  return (
    <section className="grid gap-10 py-20 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-5">
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
          Why DocScanner
        </Badge>
        <h2 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Docs can look complete and still <span className="text-orange-400">fail the first request.</span>
        </h2>
        <p className="max-w-xl text-muted-foreground">
          Most docs were written for humans, not agents. Fragmented references, missing schemas, no playgrounds,
          and weak onboarding create friction that slows teams down and breaks trust.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {issueCards.map((card) => (
          <FeatureCard key={card.title} {...card} />
        ))}
      </div>
    </section>
  );
}

function IssuesSection() {
  return (
    <section className="grid gap-10 py-20 lg:grid-cols-[0.75fr_1.25fr]">
      <div className="space-y-6">
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
          Issues and checks
        </Badge>
        <h2 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          See exactly what is broken - and <span className="text-orange-400">why.</span>
        </h2>
        <p className="text-muted-foreground">
          DocScanner runs picky checks across docs, code, examples, schemas, trust pages, and LLM entrypoints.
          Every score is transparent and backed by evidence.
        </p>
        <div className="grid gap-3 text-sm text-muted-foreground">
          {["Transparent scoring", "Evidence-backed findings", "Actionable recommendations"].map((item) => (
            <span key={item} className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-orange-300" />
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d10]/90 p-4 shadow-2xl shadow-orange-950/20">
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          {["All issues 14", "Fail 7", "Warn 5", "Pass 2"].map((tab) => (
            <span key={tab} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-muted-foreground">
              {tab}
            </span>
          ))}
        </div>
        <div className="grid gap-2">
          {issueRows.map(([issue, status, evidence, impact]) => (
            <div key={issue} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-sm md:grid-cols-[1.2fr_0.5fr_1.4fr_0.45fr]">
              <span>{issue}</span>
              <span className={status === "Pass" ? "text-emerald-300" : status === "Warn" ? "text-orange-300" : "text-red-400"}>{status}</span>
              <span className="text-muted-foreground">{evidence}</span>
              <span className="text-right text-orange-200">{impact}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScoringSection() {
  return (
    <section className="grid gap-10 py-20 lg:grid-cols-[0.75fr_1.25fr]">
      <div className="space-y-6">
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
          Scoring framework
        </Badge>
        <h2 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          One score, built from the signals that <span className="text-orange-400">matter.</span>
        </h2>
        <p className="text-muted-foreground">
          DocScanner evaluates what drives agent adoption and developer trust, then rolls it into one actionable score.
        </p>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <ScoreRing score={69} />
          <p className="mt-5 text-sm text-muted-foreground">Needs improvement. Address high-impact gaps to improve agent readiness and discoverability.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scoreCards.map(([label, score, status, Icon]) => (
          <div key={label} className="rounded-3xl border border-white/10 bg-[#0b0d10]/90 p-5">
            <div className="flex items-center justify-between">
              <Icon className="h-5 w-5 text-orange-300" />
              <span className={status === "Pass" ? "text-emerald-300" : status === "Fail" ? "text-red-400" : "text-orange-300"}>{score}</span>
            </div>
            <p className="mt-4 text-sm font-medium">{label}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-orange-500" style={{ width: `${score}%` }} />
            </div>
            <p className="mt-6 w-fit rounded-full bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">{status}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportSection() {
  return (
    <section className="grid gap-10 py-20 lg:grid-cols-[0.75fr_1.25fr]">
      <div className="space-y-6">
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
          Remediation reports
        </Badge>
        <h2 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Turn audit results <span className="text-orange-400">into a fix plan</span> your team can ship.
        </h2>
        <p className="text-muted-foreground">
          Get prioritized fixes, references, code examples, and a machine-readable remediation artifact for docs teams and agents.
        </p>
      </div>
      <div className="grid overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d10]/90 shadow-2xl shadow-orange-950/20 lg:grid-cols-2">
        <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
          <p className="mb-5 text-sm font-medium">Human-readable report</p>
          <ScoreRing score={69} />
          <div className="mt-6 grid gap-3">
            {["Expose OpenAPI or schema", "Include cURL examples", "Link to playground or sandbox"].map((item) => (
              <div key={item} className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
        <pre className="overflow-hidden p-6 font-mono text-xs leading-6 text-muted-foreground">
{`# DocScanner Remediation Report
version: 1.0
overall_score: 69

issues:
  - id: api-schema
    severity: high
    recommendation: Publish OpenAPI

acceptance:
  - /openapi.json is reachable
  - auth and errors are documented`}
        </pre>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 text-center">
      <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
        How it works
      </Badge>
      <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
        Scan. Score. Fix. <span className="text-orange-400">Repeat.</span>
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
        DocScanner turns your docs into a developer-ready system in four simple steps.
      </p>
      <div className="mt-10 grid gap-4 text-left md:grid-cols-2 lg:grid-cols-4">
        {steps.map(([title, text], index) => (
          <div key={title} className="rounded-3xl border border-white/10 bg-[#0b0d10]/90 p-5">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-orange-500/30 bg-orange-500/10 text-sm text-orange-200">
              {index + 1}
            </span>
            <p className="mt-16 font-medium">{title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="py-20">
      <div className="mx-auto max-w-3xl text-center">
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
          Transparent pricing
        </Badge>
        <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Simple pricing for teams improving <span className="text-orange-400">developer docs.</span>
        </h2>
        <p className="mt-4 text-muted-foreground">Start free, scale when you are ready. All plans include core scanning and reports your team can trust.</p>
      </div>
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {pricing.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-3xl border p-6 ${plan.featured ? "border-orange-500/40 bg-orange-500/[0.06] shadow-2xl shadow-orange-950/30" : "border-white/10 bg-[#0b0d10]/90"}`}
          >
            {plan.featured ? <Badge className="mb-4 bg-orange-500/15 text-orange-200 hover:bg-orange-500/15">Most popular</Badge> : null}
            <p className="text-lg font-medium">{plan.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
            <p className="mt-6 text-4xl font-semibold tracking-[-0.05em]">
              {plan.price}
              {plan.price !== "Custom" ? <span className="text-base text-muted-foreground"> /mo</span> : null}
            </p>
            <Button asChild className={`mt-6 w-full ${plan.featured ? "bg-orange-500 text-black hover:bg-orange-400" : ""}`} variant={plan.featured ? "default" : "outline"}>
              <Link href="/app">
                {plan.cta} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <div className="mt-6 grid gap-3 border-t border-white/10 pt-6">
              {plan.features.map((feature) => (
                <span key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-orange-300" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-y border-white/10 py-20 text-center">
      <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
        Agent-ready docs intelligence
      </Badge>
      <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
        Know what your docs are missing <span className="text-orange-400">before your users do.</span>
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
        Scan documentation, score readiness, and get a prioritized fix plan before friction becomes support load.
      </p>
      <div className="mt-8 flex justify-center">
        <Button asChild size="lg" className="h-12 rounded-xl bg-orange-500 px-7 text-black hover:bg-orange-400">
          <Link href="/app">
            Scan your docs <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="flex flex-col gap-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
      <div>
        <Link href="/" className="flex items-center gap-3 text-foreground">
          <DocScannerMark />
          <span className="font-semibold">DocScanner</span>
        </Link>
        <p className="mt-3 max-w-sm">Agent-ready docs intelligence. Built for developers, docs teams, and AI agents.</p>
      </div>
      <div className="flex flex-wrap gap-5">
        <a href="#product" className="hover:text-foreground">Product</a>
        <a href="#pricing" className="hover:text-foreground">Pricing</a>
        <Link href="/app" className="hover:text-foreground">App</Link>
        <a href="https://x.com/juampitech" target="_blank" rel="noreferrer" className="hover:text-foreground">
          Made by juampi
        </a>
      </div>
    </footer>
  );
}

function FeatureCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0b0d10]/90 p-5">
      <div className="grid h-11 w-11 place-items-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-300">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-8 font-medium">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}

function Metric({ value, label, icon: Icon }: { value: string; label: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-300">
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <strong className="block text-foreground">{value}</strong>
        <span className="text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div className="relative grid h-36 w-36 place-items-center rounded-full bg-[conic-gradient(from_210deg,#ff6a00_0deg,#ff8a1f_calc(var(--score)*3.6deg),rgba(255,255,255,0.08)_0deg)]" style={{ "--score": score } as React.CSSProperties}>
      <div className="absolute inset-3 rounded-full bg-[#0b0d10]" />
      <div className="relative text-center">
        <p className="text-4xl font-semibold tracking-[-0.05em]">{score}</p>
        <p className="text-xs text-muted-foreground">/100</p>
      </div>
    </div>
  );
}

function DocScannerMark() {
  return (
    <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-orange-500/25 bg-orange-500/10">
      <span className="absolute h-6 w-6 rounded-full border-2 border-orange-500/90 border-r-transparent" />
      <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_18px_rgba(255,106,0,0.95)]" />
      <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-orange-300" />
    </span>
  );
}
