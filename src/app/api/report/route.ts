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

function buildReportPrompt(audit: AuditResult) {
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

  return `You are a senior developer relations and technical documentation strategist.

Create TWO separate remediation artifacts for this developer platform audit.

Site: ${audit.normalizedUrl}
Overall score: ${audit.overallScore}/100
Category scores: ${audit.categories.map((category) => `${category.title}: ${category.score}`).join(", ")}

Missing or weak checks:
${JSON.stringify(failingChecks, null, 2)}

Detected assets:
${JSON.stringify(audit.assets.slice(0, 40), null, 2)}

Scanned page samples:
${JSON.stringify(scannedPageSummaries, null, 2)}

Return exactly this format, with no prose outside the tags:

<human-report>
# Remediation Report: ${audit.normalizedUrl}

Write a polished, PDF-export-friendly Markdown report for a human docs owner, founder, PM, or developer relations lead.

Required sections:
1. Executive summary
2. What is working
3. What is failing and why it matters
4. Highest-priority fixes
5. Practical examples tailored to the audited business
6. 7-day, 30-day, and 90-day roadmap
7. Final assessment

Style rules:
- Explain business impact, adoption risk, and developer journey gaps.
- Keep it readable for humans, not just a task list.
- Include concrete examples when possible, such as a quickstart outline, example cURL, response JSON, error JSON, or navigation labels.
- Be direct, picky, and specific. Do not be fluffy.
</human-report>

<agent-instructions>
# Agent Docs Remediation Instructions: ${audit.normalizedUrl}

Write a repo-ready Markdown instruction file that a coding agent can paste into a docs repository and execute.

Required sections:
1. Goal
2. Files to create
3. Files to edit
4. Navigation changes
5. Page templates
6. Required examples
7. Acceptance criteria
8. Constraints and do-not-do rules
9. Suggested llms.txt

Style rules:
- Prefer exact file paths and route paths such as docs/quickstart.md, docs/reliability.md, public/llms.txt, public/openapi.json.
- Use checklists and acceptance criteria.
- Remove executive storytelling.
- Make instructions deterministic enough for another AI agent to implement.
- Include a complete first-pass llms.txt draft.
</agent-instructions>

Do not merge the two audiences.`;
}

function buildFallbackReport(audit: AuditResult): AuditReport {
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

  const humanReportMarkdown = [
    `# Remediation Report: ${audit.normalizedUrl}`,
    "",
    `## Executive Summary`,
    `${audit.normalizedUrl} scored ${audit.overallScore}/100. The audit found useful surface area, but the docs need a clearer first-success journey for developers and stronger machine-readable entrypoints for agents.`,
    "",
    "The main issue is not just missing pages. It is that a new developer or AI agent cannot reliably answer what the API does, how to make the first request, what a valid response looks like, how failures behave, and where the canonical schema lives.",
    "",
    "## What Is Working",
    ...audit.summary.strengths.map((strength) => `- ${strength}`),
    "",
    "## What Is Failing And Why It Matters",
    ...nonPassing.slice(0, 8).map(
      ({ category, check }) =>
        `- **${category}: ${check.label}** - ${check.description} ${check.fix ? `Fix: ${check.fix}` : ""}`,
    ),
    "",
    "## Top Priority Fixes",
    ...topIssues.map(
      (issue, index) =>
        `### ${index + 1}. ${issue.title}\n\n**Impact:** ${issue.impact}\n\n**Concrete fix:** ${issue.fix}\n\n**CTA:** ${issue.cta}`,
    ),
    "",
    "## Practical Example: Quickstart Pattern",
    "```md",
    "# Quickstart",
    "",
    "## 1. Get an API key",
    "## 2. Make your first request",
    "## 3. Understand the response",
    "## 4. Common errors",
    "## 5. Next steps",
    "```",
    "",
    "## Roadmap",
    "### 7 Days",
    ...topIssues.slice(0, 3).map((issue) => `- ${issue.cta}`),
    "",
    "### 30 Days",
    ...suggestedAssets.slice(0, 5).map((asset) => `- ${asset}`),
    "",
    "### 90 Days",
    "- Build a complete onboarding system around quickstart, authentication, concepts, tutorials, and troubleshooting.",
    "- Add agent-focused docs, machine-readable schemas, examples, and use-case guides.",
    "- Establish a docs release process so every API change updates the docs and changelog.",
    "",
    "## Final Assessment",
    "Fix the developer journey basics before adding more fragmented content. Quickstart, OpenAPI, examples, reliability docs, llms.txt, changelog, and GitHub examples should move the score materially within one quarter.",
  ].join("\n");

  const agentInstructionsMarkdown = [
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
    executiveSummary: `${audit.normalizedUrl} scored ${audit.overallScore}/100. The generated output now includes a human remediation report and an agent-ready implementation file.`,
    humanReportMarkdown,
    agentInstructionsMarkdown,
    topIssues,
    roadmap: [
      {
        timeframe: "7 days",
        actions: topIssues.slice(0, 3).map((issue) => issue.cta),
      },
      {
        timeframe: "30 days",
        actions: suggestedAssets.slice(0, 5),
      },
      {
        timeframe: "90 days",
        actions: [
          "Add benchmark-quality cookbooks for the most common use cases.",
          "Instrument docs feedback and re-audit weekly.",
          "Create video walkthroughs for every core integration path.",
        ],
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
