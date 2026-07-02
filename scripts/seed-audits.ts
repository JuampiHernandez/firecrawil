import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { runAudit } from "../src/lib/audit/firecrawl";
import { normalizeUrl } from "../src/lib/audit/scoring";
import { hostKey, rootDomain } from "../src/lib/audit/url";

const seedUrls = [
  "https://www.firecrawl.dev",
  "https://supabase.com",
  "https://vercel.com",
  "https://stripe.com",
];

loadEnv(".env.local");
loadEnv(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");
}

if (!process.env.FIRECRAWL_API_KEY) {
  throw new Error("Set FIRECRAWL_API_KEY before seeding.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

for (const url of seedUrls) {
  console.log(`Auditing ${url}`);
  const audit = await runAudit(url);

  const { error } = await supabase.from("audits").upsert(
    {
      host_key: hostKey(url),
      root_domain: rootDomain(url),
      normalized_url: normalizeUrl(url),
      input_url: url,
      overall_score: audit.overallScore,
      result: audit,
      scanned_at: audit.scannedAt,
      created_by: null,
    },
    { onConflict: "host_key" },
  );

  if (error) {
    throw new Error(`Failed to seed ${url}: ${error.message}`);
  }

  console.log(`Stored ${url} (${audit.overallScore}/100, ${audit.stats.scannedPages} pages)`);
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
