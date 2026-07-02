import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { AuditReport, AuditResult } from "../src/lib/audit/types";

type CacheSource = {
  kind: string;
  path?: string;
  recoveredAt?: string;
};

type AuditCacheRecord = {
  schemaVersion: 1;
  type: "audit";
  completeness: "complete";
  source?: CacheSource;
  host_key: string;
  root_domain: string;
  normalized_url: string;
  input_url: string;
  overall_score: number;
  scanned_at: string;
  created_by?: string | null;
  result: AuditResult;
  report?: AuditReport;
};

type ReportCacheRecord = {
  schemaVersion: 1;
  type: "report";
  completeness: "complete";
  source?: CacheSource;
  host_key: string;
  report: AuditReport;
  created_by?: string | null;
};

type LegacyReportRecord = {
  schemaVersion: 1;
  type: "legacy_report";
  completeness: "partial_report_only";
  source?: CacheSource;
  host_key: string;
  root_domain: string;
  normalized_url: string;
  input_url: string;
  overall_score?: number;
  scanned_at?: string | null;
  notes: string;
  report: AuditReport;
};

type CacheRecord = AuditCacheRecord | ReportCacheRecord | LegacyReportRecord;

let supabase: ReturnType<typeof createClient>;

void main();

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const cacheArg = args.find((arg) => arg !== "--dry-run");
  const cachePath = resolve(process.cwd(), cacheArg ?? "data/recovered-scan-cache.jsonl");
  const records = readJsonl(cachePath);

  if (dryRun) {
    const completeAudits = records.filter((record) => record.type === "audit").length;
    const completeReports = records.filter((record) => record.type === "report").length;
    const partialReports = records.filter((record) => record.type === "legacy_report").length;

    console.log(
      `Validated ${records.length} records from ${cachePath}: ${completeAudits} complete audits, ${completeReports} complete reports, ${partialReports} partial legacy reports.`,
    );
    return;
  }

  loadEnv(".env.local");
  loadEnv(".env");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before importing.");
  }

  supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  let importedAudits = 0;
  let importedReports = 0;
  let skipped = 0;

  for (const record of records) {
    if (record.type === "legacy_report") {
      skipped += 1;
      console.warn(
        `Skipped partial legacy report for ${record.host_key}: ${record.notes}`,
      );
      continue;
    }

    if (record.type === "audit") {
      const auditId = await upsertAudit(record);
      importedAudits += 1;

      if (record.report) {
        await upsertReport(auditId, record.report, record.created_by ?? null);
        importedReports += 1;
      }
      continue;
    }

    const auditId = await getAuditId(record.host_key);
    if (!auditId) {
      skipped += 1;
      console.warn(`Skipped report for ${record.host_key}: no matching audit row.`);
      continue;
    }

    await upsertReport(auditId, record.report, record.created_by ?? null);
    importedReports += 1;
  }

  console.log(
    `Imported ${importedAudits} audits and ${importedReports} reports from ${cachePath}. Skipped ${skipped} records.`,
  );
}

async function upsertAudit(record: AuditCacheRecord) {
  const { data, error } = await supabase
    .from("audits")
    .upsert(
      {
        host_key: record.host_key,
        root_domain: record.root_domain,
        normalized_url: record.normalized_url,
        input_url: record.input_url,
        overall_score: record.overall_score,
        result: record.result,
        scanned_at: record.scanned_at,
        created_by: record.created_by ?? null,
      },
      { onConflict: "host_key" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to import audit ${record.host_key}: ${error?.message ?? "missing id"}`);
  }

  console.log(`Imported audit ${record.host_key} (${record.overall_score}/100)`);
  return data.id as string;
}

async function getAuditId(hostKey: string) {
  const { data, error } = await supabase
    .from("audits")
    .select("id")
    .eq("host_key", hostKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up audit ${hostKey}: ${error.message}`);
  }

  return data?.id as string | undefined;
}

async function upsertReport(auditId: string, report: AuditReport, createdBy: string | null) {
  const { error } = await supabase.from("reports").upsert(
    {
      audit_id: auditId,
      report,
      created_by: createdBy,
    },
    { onConflict: "audit_id" },
  );

  if (error) {
    throw new Error(`Failed to import report for audit ${auditId}: ${error.message}`);
  }
}

function readJsonl(path: string) {
  if (!existsSync(path)) {
    throw new Error(`Cache file not found: ${path}`);
  }

  return readFileSync(path, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as CacheRecord;
      } catch (error) {
        throw new Error(
          `Invalid JSON on line ${index + 1}: ${
            error instanceof Error ? error.message : "unknown parse error"
          }`,
        );
      }
    });
}

function loadEnv(fileName: string) {
  const path = resolve(process.cwd(), fileName);
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    process.env[key] ??= value;
  }
}
