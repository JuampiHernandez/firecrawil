import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCreditsForVariant } from "@/lib/payments/credits";
import { createAdminClient } from "@/lib/supabase/admin";

const customDataSchema = z.object({
  user_id: z.string().uuid(),
  credits: z.coerce.number().int().positive().optional(),
});

type LemonSqueezyWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: unknown;
  };
  data?: {
    id?: string;
    attributes?: {
      variant_id?: number | string;
      total?: number;
      currency?: string;
    };
  };
};

export async function POST(request: Request) {
  const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "Lemon Squeezy webhook secret is not configured." }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("X-Signature") ?? "";

  if (!isValidSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as LemonSqueezyWebhookPayload;
  const eventName = payload.meta?.event_name;

  if (eventName !== "order_created") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const customData = customDataSchema.safeParse(payload.meta?.custom_data);
  const providerOrderId = payload.data?.id;
  const credits = getCreditsForVariant(payload.data?.attributes?.variant_id) ?? customData.data?.credits;

  if (!customData.success || !providerOrderId || !credits) {
    return NextResponse.json({ error: "Webhook is missing credit purchase metadata." }, { status: 400 });
  }

  const providerEventId = `${eventName}:${providerOrderId}`;
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("apply_credit_purchase", {
    purchase_user_id: customData.data.user_id,
    purchase_provider_event_id: providerEventId,
    purchase_provider_order_id: providerOrderId,
    purchase_credits: credits,
    purchase_amount_cents: payload.data?.attributes?.total ?? null,
    purchase_currency: payload.data?.attributes?.currency ?? null,
    purchase_raw_event: payload,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true, applied: Boolean(data) });
}

function isValidSignature(rawBody: string, signature: string, secret: string) {
  if (!rawBody || !signature) return false;

  try {
    const digest = Buffer.from(crypto.createHmac("sha256", secret).update(rawBody).digest("hex"), "hex");
    const received = Buffer.from(signature, "hex");

    return digest.length === received.length && crypto.timingSafeEqual(digest, received);
  } catch {
    return false;
  }
}
