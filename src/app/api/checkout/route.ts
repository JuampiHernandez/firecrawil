import { NextResponse } from "next/server";
import { z } from "zod";
import { getCreditPack } from "@/lib/payments/credits";
import { createClient } from "@/lib/supabase/server";

const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";

const requestSchema = z.object({
  packId: z.enum(["starter", "growth"]),
});

type LemonSqueezyCheckoutResponse = {
  data?: {
    attributes?: {
      url?: string;
    };
  };
  errors?: Array<{ detail?: string; title?: string }>;
};

export async function POST(request: Request) {
  if (!paymentsEnabled) {
    return NextResponse.json({ error: "Paid credit checkout is not enabled yet." }, { status: 503 });
  }

  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid credit pack." }, { status: 400 });
  }

  const pack = getCreditPack(parsed.data.packId);
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = pack ? process.env[pack.variantEnvKey] : undefined;

  if (!pack || !apiKey || !storeId || !variantId) {
    return NextResponse.json(
      { error: "Lemon Squeezy is not configured for this credit pack yet." },
      { status: 500 },
    );
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
    return NextResponse.json({ error: "Sign in to buy scan credits.", code: "auth_required" }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: user.email,
            name: user.user_metadata?.full_name,
            custom: {
              user_id: user.id,
              pack_id: pack.id,
              credits: pack.credits,
            },
          },
          product_options: {
            redirect_url: `${origin}/app?payment=success`,
            receipt_button_text: "Back to DocScanner",
            receipt_link_url: `${origin}/app?payment=success`,
            receipt_thank_you_note: "Your scan credits will appear as soon as Lemon Squeezy confirms the payment.",
          },
          checkout_options: {
            embed: false,
            media: false,
            logo: true,
            desc: true,
            discount: false,
            button_color: "#f97316",
          },
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: storeId,
            },
          },
          variant: {
            data: {
              type: "variants",
              id: variantId,
            },
          },
        },
      },
    }),
  });

  const payload = (await response.json()) as LemonSqueezyCheckoutResponse;
  const checkoutUrl = payload.data?.attributes?.url;

  if (!response.ok || !checkoutUrl) {
    const message = payload.errors?.[0]?.detail ?? payload.errors?.[0]?.title ?? "Could not create checkout.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ url: checkoutUrl });
}
