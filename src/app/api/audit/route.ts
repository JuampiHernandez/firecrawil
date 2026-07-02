import { NextResponse } from "next/server";
import { z } from "zod";
import { runAudit } from "@/lib/audit/firecrawl";
import { normalizeUrl } from "@/lib/audit/scoring";
import type { AuditApiResponse, AuditResult } from "@/lib/audit/types";
import { hostKey, rootDomain } from "@/lib/audit/url";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  url: z.string().min(3),
  force: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid developer platform URL." }, { status: 400 });
  }

  let key: string;
  let domain: string;
  try {
    key = hostKey(parsed.data.url);
    domain = rootDomain(parsed.data.url);
  } catch {
    return NextResponse.json({ error: "Enter a valid developer platform URL." }, { status: 400 });
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
      { error: "Sign in to run audits.", code: "auth_required" },
      { status: 401 },
    );
  }

  // Cache lookup: exact host first, then any derivative on the same root domain.
  if (!parsed.data.force) {
    const { data: exact } = await supabase
      .from("audits")
      .select("id, result")
      .eq("host_key", key)
      .maybeSingle();

    if (exact) {
      return NextResponse.json({
        auditId: exact.id,
        cached: true,
        audit: exact.result as AuditResult,
      } satisfies AuditApiResponse);
    }

    const { data: derivative } = await supabase
      .from("audits")
      .select("id, result")
      .eq("root_domain", domain)
      .order("scanned_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (derivative) {
      return NextResponse.json({
        auditId: derivative.id,
        cached: true,
        audit: derivative.result as AuditResult,
      } satisfies AuditApiResponse);
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_paid")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_paid) {
    return NextResponse.json(
      {
        error: "Fresh scans require a paid account. This site has not been audited yet.",
        code: "paid_required",
      },
      { status: 403 },
    );
  }

  if (!process.env.FIRECRAWL_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Missing FIRECRAWL_API_KEY. Create .env.local from .env.example and add a Firecrawl API key to run real audits.",
      },
      { status: 400 },
    );
  }

  try {
    const audit = await runAudit(parsed.data.url);

    const { data: saved, error: saveError } = await supabase
      .from("audits")
      .upsert(
        {
          host_key: key,
          root_domain: domain,
          normalized_url: normalizeUrl(parsed.data.url),
          input_url: parsed.data.url,
          overall_score: audit.overallScore,
          result: audit,
          scanned_at: audit.scannedAt,
          created_by: user.id,
        },
        { onConflict: "host_key" },
      )
      .select("id")
      .single();

    if (saveError || !saved) {
      throw new Error(saveError?.message ?? "Failed to store the audit.");
    }

    // A re-scan invalidates the previously generated report.
    if (parsed.data.force) {
      await supabase.from("reports").delete().eq("audit_id", saved.id);
    }

    return NextResponse.json({
      auditId: saved.id,
      cached: false,
      audit,
    } satisfies AuditApiResponse);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The audit failed while collecting evidence from the site.",
      },
      { status: 500 },
    );
  }
}
