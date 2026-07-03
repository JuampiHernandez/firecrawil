import { AuditApp } from "@/components/audit-app";
import { createClient } from "@/lib/supabase/server";

const ownerProfileEmail = "juampihernandez01@gmail.com";

export default async function AppPage() {
  const props = await getAuditAppProps();
  return <AuditApp {...props} />;
}

async function getAuditAppProps() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, isPaid: false, isSupabaseConfigured: true, pastScans: [], credits: { used: 0, granted: 0 } };
    }

    const [{ data: profile }, pastScans] = await Promise.all([
      supabase.from("profiles").select("is_paid, credits_granted, credits_used").eq("id", user.id).maybeSingle(),
      getPastScans(supabase, user.id, user.email),
    ]);

    const isPaid = Boolean(profile?.is_paid);
    const creditsGranted = profile?.credits_granted ?? 2;
    const creditsUsed = profile?.credits_used ?? 0;

    return {
      user: {
        email: user.email ?? "Signed in",
        name: user.user_metadata?.full_name,
      },
      isPaid,
      isSupabaseConfigured: true,
      credits: {
        used: creditsUsed,
        granted: creditsGranted,
      },
      pastScans: (pastScans.data ?? []).map((scan) => ({
        id: scan.id,
        url: scan.input_url || scan.normalized_url,
        score: scan.overall_score,
        scannedAt: scan.scanned_at,
      })),
    };
  } catch {
    return { user: null, isPaid: false, isSupabaseConfigured: false, pastScans: [], credits: { used: 0, granted: 0 } };
  }
}

async function getPastScans(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email?: string,
) {
  const query = supabase
    .from("audits")
    .select("id, input_url, normalized_url, overall_score, scanned_at")
    .order("scanned_at", { ascending: false });

  if (email?.toLowerCase() === ownerProfileEmail) {
    return query;
  }

  return query.eq("created_by", userId).limit(15);
}
