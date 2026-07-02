export type CreditPackId = "starter" | "growth";

export type CreditPack = {
  id: CreditPackId;
  name: string;
  credits: number;
  price: string;
  variantEnvKey: "LEMONSQUEEZY_STARTER_VARIANT_ID" | "LEMONSQUEEZY_GROWTH_VARIANT_ID";
  description: string;
};

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 2,
    price: "$1",
    variantEnvKey: "LEMONSQUEEZY_STARTER_VARIANT_ID",
    description: "Two fresh scans for quick checks.",
  },
  {
    id: "growth",
    name: "Growth",
    credits: 10,
    price: "$3",
    variantEnvKey: "LEMONSQUEEZY_GROWTH_VARIANT_ID",
    description: "Ten scans for comparing docs sites.",
  },
];

export function getCreditPack(packId: string) {
  return CREDIT_PACKS.find((pack) => pack.id === packId);
}

export function getCreditsForVariant(variantId: string | number | undefined) {
  if (!variantId) return null;
  const normalizedVariantId = String(variantId);

  const matchingPack = CREDIT_PACKS.find((pack) => process.env[pack.variantEnvKey] === normalizedVariantId);
  return matchingPack?.credits ?? null;
}
