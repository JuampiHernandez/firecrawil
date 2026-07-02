import { NextResponse } from "next/server";
import { z } from "zod";
import { runAudit } from "@/lib/audit/firecrawl";

const requestSchema = z.object({
  url: z.string().min(3),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid developer platform URL." }, { status: 400 });
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
    const result = await runAudit(parsed.data.url);
    return NextResponse.json(result);
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
