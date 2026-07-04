// Temporary diagnostic: run the real audit pipeline against given URLs and
// print a full check-by-check breakdown to understand score composition.
import { config } from "dotenv";
config({ path: ".env" });

import { runAudit } from "../src/lib/audit/firecrawl";

const targets = process.argv.slice(2);

async function main() {
  for (const target of targets) {
    console.log(`\n${"=".repeat(70)}\nAUDIT: ${target}\n${"=".repeat(70)}`);
    try {
      const result = await runAudit(target);
      console.log(`OVERALL SCORE: ${result.overallScore}  (isDevDocs: ${result.isDevDocs})`);
      console.log(
        `stats: discoveredUrls=${result.stats.discoveredUrls} scannedPages=${result.stats.scannedPages} codeBlocks=${result.stats.codeBlocks}`,
      );
      console.log(`scanned pages:`);
      for (const p of result.pages) console.log(`  - ${p.url}  [title: ${p.title ?? "none"}]`);
      for (const cat of result.categories) {
        console.log(`\n--- ${cat.title}: ${cat.score}/100`);
        for (const c of cat.checks) {
          const icon = c.status === "pass" ? "PASS" : c.status === "warn" ? "WARN" : "FAIL";
          console.log(`  [${icon}] (w=${c.weight}) ${c.label}${c.evidence ? ` | ${c.evidence.slice(0, 120)}` : ""}`);
        }
      }
      const lost = result.categories
        .flatMap((c) => c.checks)
        .filter((c) => c.status !== "pass")
        .map((c) => ({ label: c.label, weight: c.weight, status: c.status, lost: c.status === "warn" ? c.weight / 2 : c.weight }))
        .sort((a, b) => b.lost - a.lost);
      const totalLost = lost.reduce((s, c) => s + c.lost, 0);
      console.log(`\nPOINTS LOST (total ${totalLost} of 314 weight):`);
      for (const c of lost) console.log(`  -${c.lost} (${c.status}) ${c.label}`);
    } catch (err) {
      console.error(`ERROR auditing ${target}:`, err);
    }
  }
}

main();
