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
import {
  AmbientLandingEffects,
  AnimatedBar,
  AnimatedNumber,
  AnimatedScoreRing,
  HoverLift,
  PulseGlow,
  Reveal,
  RevealGroup,
  RevealItem,
  RotatingSignal,
  Spotlight,
} from "@/components/landing-effects";
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
    <main className="min-h-screen overflow-x-hidden bg-[#050607] text-foreground">
      <AmbientLandingEffects />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(255,106,0,0.18),transparent_28rem),radial-gradient(circle_at_76%_22%,rgba(255,106,0,0.12),transparent_26rem),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_20rem)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />

      <div className="relative mx-auto flex w-full max-w-[90rem] flex-col px-4 py-4 sm:px-7 lg:px-10 2xl:max-w-[110rem] 2xl:px-16 3xl:max-w-[132rem] 3xl:px-24">
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
    <header className="sticky top-3 z-20 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#090a0c]/80 px-3 py-3 shadow-2xl shadow-black/30 backdrop-blur sm:top-4">
      <Link href="/" className="flex items-center gap-3">
        <DocScannerMark />
        <span className="text-sm font-semibold tracking-[-0.03em] sm:text-base">DocScanner</span>
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
        <Button
          asChild
          className="bg-orange-500 px-3 text-black transition-transform duration-200 hover:scale-[1.04] hover:bg-orange-400 active:scale-[0.97] sm:px-4"
        >
          <Link href="/app">
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Start free scan</span>
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <Spotlight className="grid items-center gap-8 py-10 sm:py-14 lg:min-h-[40rem] lg:grid-cols-[0.9fr_1.1fr] lg:content-center lg:gap-14 lg:py-20 xl:min-h-[46rem] xl:gap-20 2xl:min-h-[50rem] 3xl:min-h-[54rem] 3xl:gap-28">
      <Reveal className="max-w-2xl space-y-6 sm:space-y-7 lg:space-y-8 3xl:max-w-3xl" y={16}>
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
          <Sparkles className="mr-1 h-3.5 w-3.5" />
          Developer docs lighthouse
        </Badge>
        <div className="space-y-5 lg:space-y-6">
          <h1 className="text-[3rem] font-semibold leading-[0.92] tracking-[-0.06em] text-balance sm:text-6xl lg:text-7xl 3xl:text-8xl">
            The Lighthouse for <span className="text-orange-400">Developer Docs.</span>
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-lg sm:leading-7 lg:text-xl lg:leading-8 3xl:max-w-2xl 3xl:text-2xl 3xl:leading-9">
            Find broken docs paths, agent blockers, stale examples, and missing specs in one scan.
          </p>
          <RotatingSignal />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:gap-4">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-xl bg-orange-500 px-6 text-black shadow-lg shadow-orange-500/20 transition-transform duration-200 hover:scale-[1.03] hover:bg-orange-400 active:scale-[0.97] lg:h-14 lg:px-8 lg:text-base"
          >
            <Link href="/app">
              Scan your docs <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 rounded-xl border-white/10 bg-white/[0.03] px-6 transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] lg:h-14 lg:px-8 lg:text-base"
          >
            <Link href="/app">
              View sample report <FileText className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid max-w-xl grid-cols-3 justify-items-center gap-2 border-y border-white/10 py-4 text-sm sm:justify-items-start sm:gap-4 sm:py-5 lg:py-7">
          <Metric value={2847} label="scans run" icon={Globe2} />
          <Metric value={1.21} decimals={2} suffix="M+" label="links analyzed" icon={Radar} />
          <Metric value={8.63} decimals={2} suffix="K+" label="reports generated" icon={FileText} />
        </div>
      </Reveal>

      <Reveal y={24} delay={0.15}>
        <ProductMockup />
      </Reveal>
    </Spotlight>
  );
}

function ProductMockup() {
  return (
    <HoverLift lift={-4} className="relative min-w-0">
      <div id="product">
      <PulseGlow className="absolute -inset-4 rounded-[2rem] bg-orange-500/15 blur-3xl sm:-inset-6" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d10]/95 p-3 shadow-2xl shadow-orange-950/30 sm:rounded-3xl sm:p-4 lg:p-6 xl:p-7">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 text-xs text-muted-foreground lg:pb-5 lg:text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <Globe2 className="h-4 w-4" />
            <span className="truncate">docs.twilio.com</span>
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300 sm:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Fresh scan
            </span>
          </div>
          <span className="shrink-0">2m ago</span>
        </div>
        <div className="grid gap-4 pt-4 lg:grid-cols-[0.36fr_0.64fr] lg:gap-5 lg:pt-6">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 lg:p-5">
            <p className="text-sm font-medium lg:text-base">Overall Score</p>
            <div className="mt-5 grid place-items-center lg:mt-6">
              <AnimatedScoreRing score={69} size={144} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center text-[11px] text-muted-foreground sm:text-xs lg:mt-6 lg:pt-5 lg:text-xs">
              <span>
                <strong className="block text-base text-foreground lg:text-lg">80</strong> Links
              </span>
              <span>
                <strong className="block text-base text-foreground lg:text-lg">14</strong> Issues
              </span>
              <span>
                <strong className="block text-base text-foreground lg:text-lg">160</strong> Assets
              </span>
            </div>
          </div>
          <div className="grid gap-4 lg:gap-5">
            <div className="grid gap-3 sm:grid-cols-3 lg:gap-4">
              {scoreCards.slice(0, 6).map(([label, score, status, Icon]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-colors duration-300 hover:border-orange-500/30 hover:bg-white/[0.05] lg:p-4"
                >
                  <div className="flex items-center justify-between gap-2 text-xs lg:text-sm">
                    <span>{label}</span>
                    <Icon className="h-4 w-4 text-orange-300" />
                  </div>
                  <div className="mt-3 flex items-center gap-2 lg:mt-4">
                    <AnimatedBar value={score} />
                    <span className={status === "Pass" ? "text-emerald-300" : "text-orange-300"}>{score}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3 sm:p-4 lg:p-5">
              <p className="mb-3 text-sm font-medium lg:text-base">Top issues</p>
              <div className="grid gap-2 lg:gap-3">
                {issueRows.slice(0, 3).map(([issue, status, evidence]) => (
                  <div key={issue} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2 lg:py-3">
                    <AlertTriangle className={status === "Fail" ? "h-4 w-4 text-red-400" : "h-4 w-4 text-orange-300"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm lg:text-base">{issue}</p>
                      <p className="truncate text-xs text-muted-foreground">{evidence}</p>
                    </div>
                    <span className="text-xs text-orange-200">High</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-3 sm:gap-3 lg:mt-6 lg:gap-3 lg:pt-6">
          {["Crawl Complete", "Assets Found", "Report Ready"].map((label) => (
            <div key={label} className="flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground lg:py-2.5 lg:text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              {label}
            </div>
          ))}
        </div>
      </div>
      </div>
    </HoverLift>
  );
}

function ProblemSection() {
  return (
    <section className="grid gap-10 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:py-28 3xl:py-36">
      <Reveal className="space-y-5 lg:space-y-6" y={16}>
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
          Why DocScanner
        </Badge>
        <h2 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl 3xl:text-7xl">
          Docs can look complete and still <span className="text-orange-400">fail the first request.</span>
        </h2>
        <p className="max-w-xl text-muted-foreground lg:text-lg">
          Most docs were written for humans, not agents. Fragmented references, missing schemas, no playgrounds,
          and weak onboarding create friction that slows teams down and breaks trust.
        </p>
      </Reveal>
      <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:gap-5">
        {issueCards.map((card) => (
          <RevealItem key={card.title}>
            <HoverLift className="h-full">
              <FeatureCard {...card} />
            </HoverLift>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

function IssuesSection() {
  return (
    <section className="grid gap-10 py-20 lg:grid-cols-[0.75fr_1.25fr] lg:gap-14 lg:py-28 3xl:py-36">
      <Reveal className="space-y-6" y={16}>
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
          Issues and checks
        </Badge>
        <h2 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl 3xl:text-7xl">
          See exactly what is broken - and <span className="text-orange-400">why.</span>
        </h2>
        <p className="text-muted-foreground lg:text-lg">
          DocScanner runs picky checks across docs, code, examples, schemas, trust pages, and LLM entrypoints.
          Every score is transparent and backed by evidence.
        </p>
        <div className="grid gap-3 text-sm text-muted-foreground lg:text-base">
          {["Transparent scoring", "Evidence-backed findings", "Actionable recommendations"].map((item) => (
            <span key={item} className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-orange-300" />
              {item}
            </span>
          ))}
        </div>
      </Reveal>
      <Reveal delay={0.1} y={20} className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d10]/90 p-4 shadow-2xl shadow-orange-950/20">
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          {["All issues 14", "Fail 7", "Warn 5", "Pass 2"].map((tab) => (
            <span key={tab} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-muted-foreground">
              {tab}
            </span>
          ))}
        </div>
        <RevealGroup className="grid gap-2" stagger={0.06}>
          {issueRows.map(([issue, status, evidence, impact]) => (
            <RevealItem
              key={issue}
              className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 text-sm transition-colors duration-300 hover:border-orange-500/25 hover:bg-white/[0.045] md:grid-cols-[1.2fr_0.5fr_1.4fr_0.45fr]"
            >
              <span>{issue}</span>
              <span className={status === "Pass" ? "text-emerald-300" : status === "Warn" ? "text-orange-300" : "text-red-400"}>{status}</span>
              <span className="text-muted-foreground">{evidence}</span>
              <span className="text-right text-orange-200">{impact}</span>
            </RevealItem>
          ))}
        </RevealGroup>
      </Reveal>
    </section>
  );
}

function ScoringSection() {
  return (
    <section className="grid gap-10 py-20 lg:grid-cols-[0.75fr_1.25fr] lg:gap-14 lg:py-28 3xl:py-36">
      <Reveal className="space-y-6" y={16}>
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
          Scoring framework
        </Badge>
        <h2 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl 3xl:text-7xl">
          One score, built from the signals that <span className="text-orange-400">matter.</span>
        </h2>
        <p className="text-muted-foreground lg:text-lg">
          DocScanner evaluates what drives agent adoption and developer trust, then rolls it into one actionable score.
        </p>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 lg:p-8">
          <AnimatedScoreRing score={69} />
          <p className="mt-5 text-sm text-muted-foreground lg:text-base">Needs improvement. Address high-impact gaps to improve agent readiness and discoverability.</p>
        </div>
      </Reveal>
      <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {scoreCards.map(([label, score, status, Icon]) => (
          <RevealItem key={label}>
            <HoverLift className="h-full">
              <div className="h-full rounded-3xl border border-white/10 bg-[#0b0d10]/90 p-5 transition-colors duration-300 hover:border-orange-500/30">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-orange-300" />
                  <span className={status === "Pass" ? "text-emerald-300" : status === "Fail" ? "text-red-400" : "text-orange-300"}>
                    <AnimatedNumber value={score} />
                  </span>
                </div>
                <p className="mt-4 text-sm font-medium">{label}</p>
                <AnimatedBar value={score} className="mt-4 h-2" />
                <p className="mt-6 w-fit rounded-full bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground">{status}</p>
              </div>
            </HoverLift>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

function ReportSection() {
  return (
    <section className="grid gap-10 py-20 lg:grid-cols-[0.75fr_1.25fr] lg:gap-14 lg:py-28 3xl:py-36">
      <Reveal className="space-y-6" y={16}>
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
          Remediation reports
        </Badge>
        <h2 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl 3xl:text-7xl">
          Turn audit results <span className="text-orange-400">into a fix plan</span> your team can ship.
        </h2>
        <p className="text-muted-foreground lg:text-lg">
          Get prioritized fixes, references, code examples, and a machine-readable remediation artifact for docs teams and agents.
        </p>
      </Reveal>
      <Reveal delay={0.1} y={20} className="grid overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d10]/90 shadow-2xl shadow-orange-950/20 lg:grid-cols-2">
        <div className="border-b border-white/10 p-6 lg:border-b-0 lg:border-r">
          <p className="mb-5 text-sm font-medium">Human-readable report</p>
          <AnimatedScoreRing score={69} />
          <div className="mt-6 grid gap-3">
            {["Expose OpenAPI or schema", "Include cURL examples", "Link to playground or sandbox"].map((item) => (
              <div key={item} className="rounded-xl bg-white/[0.03] px-3 py-2 text-sm transition-colors duration-300 hover:bg-white/[0.06]">
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
      </Reveal>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 text-center lg:py-28 3xl:py-36">
      <Reveal y={16}>
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
          How it works
        </Badge>
        <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl 3xl:text-7xl">
          Scan. Score. Fix. <span className="text-orange-400">Repeat.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground lg:text-lg">
          DocScanner turns your docs into a developer-ready system in four simple steps.
        </p>
      </Reveal>
      <RevealGroup className="mt-10 grid gap-4 text-left md:grid-cols-2 lg:grid-cols-4 lg:mt-14 lg:gap-5">
        {steps.map(([title, text], index) => (
          <RevealItem key={title}>
            <HoverLift className="h-full">
              <div className="h-full rounded-3xl border border-white/10 bg-[#0b0d10]/90 p-5 transition-colors duration-300 hover:border-orange-500/30">
                <span className="grid h-8 w-8 place-items-center rounded-full border border-orange-500/30 bg-orange-500/10 text-sm text-orange-200">
                  {index + 1}
                </span>
                <p className="mt-16 font-medium">{title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{text}</p>
              </div>
            </HoverLift>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="py-20 lg:py-28 3xl:py-36">
      <Reveal className="mx-auto max-w-3xl text-center" y={16}>
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
          Transparent pricing
        </Badge>
        <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl 3xl:text-7xl">
          Simple pricing for teams improving <span className="text-orange-400">developer docs.</span>
        </h2>
        <p className="mt-4 text-muted-foreground lg:text-lg">Start free, scale when you are ready. All plans include core scanning and reports your team can trust.</p>
      </Reveal>
      <RevealGroup className="mt-10 grid gap-5 lg:mt-14 lg:grid-cols-3 lg:gap-6">
        {pricing.map((plan) => (
          <RevealItem key={plan.name}>
            <HoverLift lift={-8} className="h-full">
              <div
                className={`h-full rounded-3xl border p-6 transition-shadow duration-300 lg:p-8 ${plan.featured ? "border-orange-500/40 bg-orange-500/[0.06] shadow-2xl shadow-orange-950/30 hover:shadow-orange-900/40" : "border-white/10 bg-[#0b0d10]/90 hover:border-orange-500/20"}`}
              >
                {plan.featured ? <Badge className="mb-4 bg-orange-500/15 text-orange-200 hover:bg-orange-500/15">Most popular</Badge> : null}
                <p className="text-lg font-medium lg:text-xl">{plan.name}</p>
                <p className="mt-1 text-sm text-muted-foreground lg:text-base">{plan.description}</p>
                <p className="mt-6 text-4xl font-semibold tracking-[-0.05em] lg:text-5xl">
                  {plan.price}
                  {plan.price !== "Custom" ? <span className="text-base text-muted-foreground"> /mo</span> : null}
                </p>
                <Button
                  asChild
                  className={`mt-6 w-full transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] ${plan.featured ? "bg-orange-500 text-black hover:bg-orange-400" : ""}`}
                  variant={plan.featured ? "default" : "outline"}
                >
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
            </HoverLift>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 py-20 text-center lg:py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-3xl" />
      <Reveal y={16}>
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/10">
          Agent-ready docs intelligence
        </Badge>
        <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-7xl">
          Know what your docs are missing <span className="text-orange-400">before your users do.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground lg:text-lg">
          Scan documentation, score readiness, and get a prioritized fix plan before friction becomes support load.
        </p>
        <div className="mt-8 flex justify-center lg:mt-10">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-xl bg-orange-500 px-7 text-black shadow-lg shadow-orange-500/20 transition-transform duration-200 hover:scale-[1.04] hover:bg-orange-400 active:scale-[0.97] lg:h-14 lg:px-8 lg:text-base"
          >
            <Link href="/app">
              Scan your docs <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Reveal>
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
    <div className="group h-full rounded-3xl border border-white/10 bg-[#0b0d10]/90 p-5 transition-colors duration-300 hover:border-orange-500/30 lg:p-7">
      <div className="grid h-11 w-11 place-items-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-300 transition-shadow duration-300 group-hover:shadow-[0_0_24px_rgba(255,106,0,0.35)] lg:h-12 lg:w-12">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-8 font-medium lg:mt-10 lg:text-lg">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground lg:text-base">{text}</p>
    </div>
  );
}

function Metric({
  value,
  decimals = 0,
  suffix = "",
  label,
  icon: Icon,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:text-left sm:gap-3 lg:gap-4">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-300 sm:h-9 sm:w-9 lg:h-11 lg:w-11">
        <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
      </span>
      <span className="min-w-0">
        <strong className="block text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl lg:text-3xl">
          <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
        </strong>
        <span className="text-xs text-muted-foreground lg:text-sm">{label}</span>
      </span>
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
