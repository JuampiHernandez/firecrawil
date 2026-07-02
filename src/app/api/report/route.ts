import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuditReport, AuditResult } from "@/lib/audit/types";

const requestSchema = z.object({
  audit: z.custom<AuditResult>(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Missing audit result." }, { status: 400 });
  }

  const audit = parsed.data.audit;
  const fallback = buildFallbackReport(audit);

  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return NextResponse.json(fallback);
  }

  try {
    const { text } = await generateText({
      model: "openai/gpt-5.4",
      prompt: buildReportPrompt(audit),
    });

    return NextResponse.json({
      ...fallback,
      rawMarkdown: text,
      executiveSummary: text.split("\n").filter(Boolean).slice(0, 2).join(" "),
    } satisfies AuditReport);
  } catch {
    return NextResponse.json(fallback);
  }
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

  return `You are a senior developer relations and technical documentation strategist.

Create a concise but professional remediation report for this developer platform audit.

Site: ${audit.normalizedUrl}
Overall score: ${audit.overallScore}/100
Category scores: ${audit.categories.map((category) => `${category.title}: ${category.score}`).join(", ")}

Missing or weak checks:
${JSON.stringify(failingChecks, null, 2)}

Detected assets:
${JSON.stringify(audit.assets.slice(0, 40), null, 2)}

Write in Markdown with:
1. Executive summary
2. Top priority fixes, each with impact, concrete fix, and CTA
3. 7-day, 30-day, 90-day roadmap
4. Suggested docs/content/demo assets to create
5. Draft llms.txt content

Be direct, picky, and specific. Do not be fluffy.`;
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
    `# ${audit.normalizedUrl}`,
    "",
    "## Docs",
    "- [Quickstart](/docs/quickstart): First working integration path.",
    "- [API Reference](/docs/api-reference): Endpoint contracts, parameters, responses, and errors.",
    "- [SDKs](/docs/sdks): Install and use official SDKs.",
    "- [Examples](/docs/examples): Real applications and copyable recipes.",
    "- [Changelog](/changelog): Product and API updates.",
  ].join("\n");

  const rawMarkdown = [
    `# AgentDocs Remediation Report`,
    "",
    `## Executive Summary`,
    `${audit.normalizedUrl} scored ${audit.overallScore}/100. The fastest wins are the missing high-signal assets that affect first-run success and agent discoverability.`,
    "",
    "## Top Priority Fixes",
    ...topIssues.map(
      (issue, index) =>
        `${index + 1}. **${issue.title}**\n   - Impact: ${issue.impact}\n   - Fix: ${issue.fix}\n   - CTA: ${issue.cta}`,
    ),
    "",
    "## Suggested llms.txt",
    "```txt",
    llmsTxtDraft,
    "```",
  ].join("\n");

  return {
    title: "AgentDocs Remediation Report",
    executiveSummary: `${audit.normalizedUrl} scored ${audit.overallScore}/100. Fix the highest-impact gaps first: agent entrypoints, quickstarts, API/SDK coverage, and demo assets.`,
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
