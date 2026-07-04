import { normalizeUrl } from "./scoring";

/**
 * Cache key for a scan target: hostname plus an intentional docs path.
 * This keeps "supabase.com" and "supabase.com/docs" from sharing one audit.
 */
export function hostKey(input: string) {
  const url = new URL(normalizeUrl(input));
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  return `${hostname}${path}`;
}

/**
 * Naive registrable domain (last two labels) used for grouping scan history.
 */
export function rootDomain(input: string) {
  const hostname = new URL(normalizeUrl(input)).hostname.toLowerCase().replace(/^www\./, "");
  const parts = hostname.split(".");
  return parts.slice(-2).join(".");
}
