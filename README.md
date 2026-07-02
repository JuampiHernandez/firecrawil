# AgentDocs Auditor

A Firecrawl-powered Lighthouse for developer platforms.

Enter a product or docs URL and the app returns a minimalist scorecard for:

- Agent readiness
- Developer onboarding
- API and SDK coverage
- Content and demo assets
- Trust and community signals
- LLM discoverability

The scorecard is intentionally deterministic and evidence-based. The **Generate remediation report** button turns the audit into a deeper plan with concrete fixes, CTAs, and a draft `llms.txt`.

## Setup

```bash
npm install
cp .env.example .env.local
```

Add:

```bash
FIRECRAWL_API_KEY=fc-your-key
```

Optional:

```bash
AI_GATEWAY_API_KEY=your-ai-gateway-key
```

If no AI key is configured, report generation uses a deterministic fallback report.

## Run

```bash
npm run dev
```

If Next.js has trouble enumerating network interfaces locally, bind it explicitly:

```bash
npm run dev -- -H 127.0.0.1 -p 3001
```

## Build

```bash
npm run lint
npm run build
```

## How It Uses Firecrawl

- `/map` discovers public URLs.
- `/scrape` collects Markdown, links, and metadata from high-signal pages.
- Well-known checks look for `llms.txt`, `llms-full.txt`, `sitemap.xml`, and OpenAPI files.
- The scoring engine classifies docs, quickstarts, API references, SDKs, GitHub/package links, videos, blogs, changelogs, pricing, status, security, community, socials, playgrounds, and LLM entrypoints.

## Next Product Steps

- Add saved audits and benchmark comparisons.
- Add Firecrawl `/agent` discovery for off-site official assets.
- Add Firecrawl `/monitor` for recurring docs quality checks.
- Add PDF export for reports.
- Add authenticated workspaces for teams.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
