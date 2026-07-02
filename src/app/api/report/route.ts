import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuditReport, AuditResult, ReportApiResponse } from "@/lib/audit/types";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  auditId: z.string().uuid(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Missing audit id." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase is not configured." },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to generate reports.", code: "auth_required" },
      { status: 401 },
    );
  }

  const { data: cachedReport } = await supabase
    .from("reports")
    .select("report")
    .eq("audit_id", parsed.data.auditId)
    .maybeSingle();

  if (cachedReport) {
    return NextResponse.json({
      cached: true,
      report: cachedReport.report as AuditReport,
    } satisfies ReportApiResponse);
  }

  const { data: auditRow, error: auditError } = await supabase
    .from("audits")
    .select("result")
    .eq("id", parsed.data.auditId)
    .maybeSingle();

  if (auditError || !auditRow) {
    return NextResponse.json({ error: "Stored audit not found." }, { status: 404 });
  }

  const audit = auditRow.result as AuditResult;
  const fallback = buildFallbackReport(audit);

  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    const report = await saveReport(supabase, parsed.data.auditId, user.id, fallback);
    return NextResponse.json({ cached: false, report } satisfies ReportApiResponse);
  }

  try {
    const { text } = await generateText({
      model: "openai/gpt-5.4",
      prompt: buildReportPrompt(audit),
    });
    const generated = splitGeneratedReport(text, fallback);

    const report = {
      ...fallback,
      humanReportMarkdown: generated.humanReportMarkdown,
      agentInstructionsMarkdown: generated.agentInstructionsMarkdown,
      rawMarkdown: buildCombinedRawMarkdown(generated.humanReportMarkdown, generated.agentInstructionsMarkdown),
      executiveSummary: extractExecutiveSummary(generated.humanReportMarkdown, fallback.executiveSummary),
    } satisfies AuditReport;

    return NextResponse.json({
      cached: false,
      report: await saveReport(supabase, parsed.data.auditId, user.id, report),
    } satisfies ReportApiResponse);
  } catch {
    const report = await saveReport(supabase, parsed.data.auditId, user.id, fallback);
    return NextResponse.json({ cached: false, report } satisfies ReportApiResponse);
  }
}

async function saveReport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  auditId: string,
  userId: string,
  report: AuditReport,
) {
  const { data, error } = await supabase
    .from("reports")
    .upsert(
      {
        audit_id: auditId,
        report,
        created_by: userId,
      },
      { onConflict: "audit_id" },
    )
    .select("report")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to store the report.");
  }

  return data.report as AuditReport;
}

type ReportTier = "polish" | "improve" | "overhaul";

function getReportTier(score: number): ReportTier {
  if (score >= 85) return "polish";
  if (score >= 60) return "improve";
  return "overhaul";
}

const HUMAN_REPORT_BRIEFS: Record<ReportTier, string> = {
  polish: `This site scored high. It is already close to best-in-class, so the report must be SHORT — around 300-450 words. Do not manufacture problems to fill space.

Sections:
1. **Verdict** — 2-3 sentences: these docs are strong and how they compare to best-in-class developer docs.
2. **What stands out** — 3-5 bullets on what they do genuinely well.
3. **Worth polishing** — only the real remaining gaps (usually 2-4 items). For each: what it is and why it's worth doing, in 1-2 sentences.
4. **Bottom line** — one short paragraph.

No roadmap. No timelines. No "highest-priority fixes" framing for minor polish items.`,
  improve: `This site is decent but has real gaps. Target 500-800 words.

Sections:
1. **Verdict** — 2-3 sentences: where this site stands relative to best-in-class developer docs, and the one thing holding it back the most.
2. **What's working** — short bullets.
3. **What to fix** — the top issues (5 max), ordered by impact. For each: what's missing, why a developer or AI agent hits a wall because of it, and the concrete fix. Include a small tailored example (a cURL snippet, a nav label, a quickstart outline) only where it genuinely clarifies the fix.
4. **Start here this week** — 2-3 quick wins.
5. **Bottom line** — one short paragraph.`,
  overhaul: `This site has significant gaps. Target 800-1200 words, but stay readable — depth comes from specificity, not length.

Sections:
1. **Verdict** — honest but constructive: how far this is from best-in-class developer docs and what that costs them in adoption.
2. **What's working** — even weak sites do something right; find it.
3. **What to fix** — the issues that matter, ordered by impact. For each: what's missing, the real-world consequence, and the concrete fix with a tailored example where useful.
4. **Suggested order of work** — a simple two-phase plan: "first two weeks" and "after that". No 7/30/90-day corporate roadmap.
5. **Bottom line** — one short paragraph.`,
};

const AGENT_BRIEFS: Record<ReportTier, string> = {
  polish: `The site scored high, so this file should be SHORT and cover ONLY the specific remaining gaps listed in the failing checks. Do not scaffold pages or assets the site already has. Skip any section that has nothing real in it.`,
  improve: `Cover only the failing and warning checks. Do not tell the agent to create assets the site already has (check the detected assets list).`,
  overhaul: `Cover the failing and warning checks thoroughly. Do not tell the agent to create assets the site already has (check the detected assets list).`,
};

function buildReportPrompt(audit: AuditResult) {
  const tier = getReportTier(audit.overallScore);

  const failingChecks = audit.categories.flatMap((category) =>
    category.checks
      .filter((check) => check.status !== "pass")
      .map((check) => ({
        category: category.title,
        label: check.label,
        status: check.status,
        evidence: check.evidence,
        fix: check.fix,
      })),
  );

  const scannedPageSummaries = audit.pages.slice(0, 12).map((page) => ({
    url: page.url,
    title: page.title,
    excerpt: page.markdown?.slice(0, 900),
  }));

  return `You are an experienced developer-docs consultant writing for a busy docs owner, founder, or DevRel lead. You produce reports people actually read, not compliance documents.

Create TWO artifacts for this developer platform audit.

Site: ${audit.normalizedUrl}
Overall score: ${audit.overallScore}/100
Category scores: ${audit.categories.map((category) => `${category.title}: ${category.score}`).join(", ")}

Missing or weak checks:
${JSON.stringify(failingChecks, null, 2)}

Detected assets:
${JSON.stringify(audit.assets.slice(0, 40), null, 2)}

Scanned page samples:
${JSON.stringify(scannedPageSummaries, null, 2)}

## Benchmark calibration

Judge this site against the bar set by the strongest developer docs in the industry — the standard of docs like Vercel's, Supabase's, and Firecrawl's: a copy-paste first request within one click of the docs home, complete auth and error documentation, a published OpenAPI spec, llms.txt for agents, runnable examples, and a visible changelog. Use that bar to calibrate how severe each gap really is.

STRICT RULE: never name those companies — or any other company — in your output. Say "best-in-class developer docs" or "the strongest API docs in the industry" instead.

## Voice

- Write like a sharp consultant talking to a peer. Plain language, short paragraphs.
- Every sentence must carry a judgment or an action. No filler, no corporate framing, no legalese.
- Severity must be proportional. A missing llms.txt on otherwise excellent docs is "worth adding", not a "critical adoption risk".
- Do not pad. If there is little to say, say little.

Return exactly this format, with no prose outside the tags:

<human-report>
# Docs Report: ${audit.normalizedUrl}

${HUMAN_REPORT_BRIEFS[tier]}
</human-report>

<agent-instructions>
# Agent Docs Remediation Instructions: ${audit.normalizedUrl}

Write a repo-ready Markdown instruction file that a coding agent can paste into a docs repository and execute.

${AGENT_BRIEFS[tier]}

Use these sections, skipping any that would be empty:
1. Goal
2. Files to create
3. Files to edit
4. Navigation changes
5. Required examples
6. Acceptance criteria
7. Constraints and do-not-do rules
8. Suggested llms.txt (only if the site is missing one or theirs is weak)

Style rules:
- Prefer exact file paths and route paths such as docs/quickstart.md, docs/reliability.md, public/llms.txt, public/openapi.json.
- Use checklists and acceptance criteria.
- Make instructions deterministic enough for another AI agent to implement.
</agent-instructions>

Do not merge the two audiences.`;
}

function buildFallbackReport(audit: AuditResult): AuditReport {
  const tier = getReportTier(audit.overallScore);
  const nonPassing = audit.categories.flatMap((category) =>
    category.checks
      .filter((check) => check.status !== "pass")
      .map((check) => ({
        category: category.title,
        check,
      })),
  );

  const topIssues = nonPassing.slice(0, 6).map(({ category, check }) => ({
    title: `${category}: ${check.label}`,
    impact: check.description,
    fix: check.fix ?? "Add a clear, linked resource for this missing surface.",
    cta: `Publish or improve: ${check.label}`,
  }));

  const suggestedAssets = Array.from(
    new Set(
      nonPassing
        .map(({ check }) => check.fix)
        .filter((item): item is string => Boolean(item))
        .slice(0, 10),
    ),
  );

  const llmsTxtDraft = [
    `# ${audit.normalizedUrl} - LLM Index`,
    "",
    `base_url: ${audit.normalizedUrl}`,
    `docs_url: ${audit.normalizedUrl}`,
    "",
    "# Primary documentation",
    `- Docs Home: ${audit.normalizedUrl}`,
    `- Getting Started / Quickstart: ${audit.normalizedUrl}/docs/quickstart`,
    `- API Reference: ${audit.normalizedUrl}/docs/api-reference`,
    `- Authentication: ${audit.normalizedUrl}/docs/authentication`,
    `- Errors, Retries, and Rate Limits: ${audit.normalizedUrl}/docs/reliability`,
    `- Changelog: ${audit.normalizedUrl}/docs/changelog`,
    `- Pricing: ${audit.normalizedUrl}/pricing`,
    "",
    "# Machine-readable schema",
    `- OpenAPI Spec: ${audit.normalizedUrl}/openapi.json`,
    "",
    "# Examples and support",
    `- Examples: ${audit.normalizedUrl}/docs/examples`,
    "- GitHub Examples: Add the official GitHub organization URL here.",
    "- Status Page: Add the official status page URL here.",
    "",
    "# Notes for language models",
    "- Prefer the Quickstart for first-use guidance.",
    "- Prefer the OpenAPI spec for endpoint structure and parameter details.",
    "- Prefer the Reliability page for errors, retries, rate limits, and pagination.",
    "- Prefer examples repos for implementation patterns.",
  ].join("\n");

  const verdictByTier: Record<ReportTier, string> = {
    polish: `${audit.normalizedUrl} scored ${audit.overallScore}/100. These docs are already strong — close to the bar set by best-in-class developer docs. What follows is polish, not repair.`,
    improve: `${audit.normalizedUrl} scored ${audit.overallScore}/100. The foundation is solid, but a few gaps make the first-use experience harder than it should be for developers and AI agents.`,
    overhaul: `${audit.normalizedUrl} scored ${audit.overallScore}/100. Right now a new developer or AI agent cannot reliably answer the basics: what the API does, how to make a first request, what responses and errors look like, and where the canonical schema lives.`,
  };

  const issueLimit = tier === "polish" ? 4 : tier === "improve" ? 5 : 8;

  const humanReportMarkdown = [
    `# Docs Report: ${audit.normalizedUrl}`,
    "",
    "## Verdict",
    verdictByTier[tier],
    "",
    tier === "polish" ? "## What Stands Out" : "## What's Working",
    ...audit.summary.strengths.map((strength) => `- ${strength}`),
    "",
    tier === "polish" ? "## Worth Polishing" : "## What To Fix",
    ...nonPassing.slice(0, issueLimit).map(
      ({ category, check }) =>
        `- **${category}: ${check.label}** — ${check.description}${check.fix ? ` Fix: ${check.fix}` : ""}`,
    ),
    ...(tier === "polish"
      ? []
      : [
          "",
          "## Start Here This Week",
          ...topIssues.slice(0, 3).map((issue) => `- ${issue.cta}`),
        ]),
    "",
    "## Bottom Line",
    tier === "polish"
      ? "These docs already do the hard parts well. The items above are small additions that close the last gaps for developers and AI agents — none of them are urgent, all of them are cheap."
      : tier === "improve"
        ? "The gaps here are fixable in weeks, not months. Close the first-use gaps above before adding new content, and both developers and AI agents will get further, faster."
        : "Fix the developer journey basics before adding more content. A quickstart with a copy-paste first request, a published schema, and honest error docs will move the score more than anything else.",
  ].join("\n");

  const agentInstructionsMarkdown = tier === "polish"
    ? [
        `# Agent Docs Remediation Instructions: ${audit.normalizedUrl}`,
        "",
        "## Goal",
        "The docs are already strong. Close only the specific remaining gaps below — do not restructure or recreate existing content.",
        "",
        "## Remaining Gaps",
        ...nonPassing.map(
          ({ category, check }) =>
            `- [ ] **${category}: ${check.label}** — ${check.fix ?? check.description}`,
        ),
        "",
        "## Constraints And Do-Not-Do Rules",
        "- Do not create pages or assets the site already has.",
        "- Do not change existing navigation or route paths.",
        "- Keep new content consistent with the site's existing style and structure.",
        ...(nonPassing.some(({ check }) => check.id.toLowerCase().includes("llms"))
          ? ["", "## Suggested llms.txt", "```txt", llmsTxtDraft, "```"]
          : []),
      ].join("\n")
    : [
    `# Agent Docs Remediation Instructions: ${audit.normalizedUrl}`,
    "",
    "## Goal",
    "Improve developer onboarding, API discoverability, and LLM readiness for the audited docs site.",
    "",
    "## Files To Create",
    "- `docs/quickstart.md`",
    "- `docs/reliability.md`",
    "- `docs/changelog.md`",
    "- `docs/examples.md`",
    "- `public/llms.txt`",
    "- `public/llms-full.txt`",
    "- `public/openapi.json` or `public/openapi.yaml`",
    "",
    "## Files To Edit",
    "- Docs homepage or landing page",
    "- Docs navigation/sidebar config",
    "- Footer links",
    "- API reference pages for the most important endpoints",
    "",
    "## Navigation Changes",
    "- Add `Getting Started` linking to `/docs/quickstart`.",
    "- Add `API Reference` linking to `/docs/api-reference`.",
    "- Add `Errors and Rate Limits` linking to `/docs/reliability`.",
    "- Add `Changelog`, `Pricing`, `GitHub`, and `LLM index` links.",
    "",
    "## Page Templates",
    "### Quickstart",
    "- Explain what the API is for in 2-3 bullets.",
    "- Show how to get an API key.",
    "- Include one complete cURL request.",
    "- Include one complete JSON success response.",
    "- Include one complete JSON error response.",
    "- Link to authentication, API reference, reliability, examples, and pricing.",
    "",
    "### Reliability",
    "- Document HTTP status codes, error schema, rate limits, retry behavior, timeout guidance, pagination, and backoff recommendations.",
    "",
    "## Required Examples",
    "- cURL first request",
    "- JavaScript or TypeScript request",
    "- Python request",
    "- Success response JSON",
    "- Error response JSON",
    "- Retry/backoff example",
    "",
    "## Acceptance Criteria",
    "- A new developer can make a successful first request in under 5 minutes.",
    "- Every core endpoint has request, response, and error examples.",
    "- OpenAPI is published and linked from docs home, API reference, footer, and `llms.txt`.",
    "- `llms.txt` and `llms-full.txt` are available at the site root.",
    "- Changelog and pricing are visible from docs navigation or footer.",
    "",
    "## Constraints And Do-Not-Do Rules",
    "- Do not add more fragmented concept pages before shipping quickstart, OpenAPI, examples, and reliability docs.",
    "- Do not imply SDK support unless official packages or examples exist.",
    "- Do not publish placeholder examples that cannot be copied and run.",
    "- Keep route paths stable and update internal links after creating pages.",
    "",
    "## Suggested llms.txt",
    "```txt",
    llmsTxtDraft,
    "```",
  ].join("\n");

  const rawMarkdown = buildCombinedRawMarkdown(humanReportMarkdown, agentInstructionsMarkdown);

  return {
    title: "Docs Remediation Reports",
    executiveSummary: verdictByTier[tier],
    humanReportMarkdown,
    agentInstructionsMarkdown,
    topIssues,
    roadmap:
      tier === "polish"
        ? [
            {
              timeframe: "Whenever convenient",
              actions: topIssues.map((issue) => issue.cta),
            },
          ]
        : [
            {
              timeframe: "First two weeks",
              actions: topIssues.slice(0, 3).map((issue) => issue.cta),
            },
            {
              timeframe: "After that",
              actions: suggestedAssets.slice(0, 5),
            },
          ],
    suggestedAssets,
    llmsTxtDraft,
    rawMarkdown,
  };
}

function splitGeneratedReport(text: string, fallback: AuditReport) {
  const humanReportMarkdown =
    text.match(/<human-report>\s*([\s\S]*?)\s*<\/human-report>/i)?.[1]?.trim() ?? text.trim() ?? fallback.humanReportMarkdown;
  const agentInstructionsMarkdown =
    text.match(/<agent-instructions>\s*([\s\S]*?)\s*<\/agent-instructions>/i)?.[1]?.trim() ??
    fallback.agentInstructionsMarkdown;

  return {
    humanReportMarkdown,
    agentInstructionsMarkdown,
  };
}

function buildCombinedRawMarkdown(humanReportMarkdown: string, agentInstructionsMarkdown: string) {
  return [
    "# Generated Docs Remediation Package",
    "",
    "## Human / PDF Report",
    "",
    humanReportMarkdown,
    "",
    "## Agent Remediation File",
    "",
    agentInstructionsMarkdown,
  ].join("\n");
}

function extractExecutiveSummary(humanReportMarkdown: string, fallback: string) {
  const meaningfulLines = humanReportMarkdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("```"));

  return meaningfulLines.slice(0, 2).join(" ") || fallback;
}
