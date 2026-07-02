import { normalizeUrl } from "./scoring";

/**
 * Cache key for a site: hostname without the leading "www.".
 * "https://www.stripe.com/docs/x" and "stripe.com" both map to "stripe.com".
 */
export function hostKey(input: string) {
  const hostname = new URL(normalizeUrl(input)).hostname.toLowerCase();
  return hostname.replace(/^www\./, "");
}

/**
 * Naive registrable domain (last two labels) used to match derivatives like
 * "docs.stripe.com" against an existing "stripe.com" audit.
 */
export function rootDomain(input: string) {
  const parts = hostKey(input).split(".");
  return parts.slice(-2).join(".");
}
