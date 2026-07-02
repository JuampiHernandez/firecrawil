import { AuditApp } from "@/components/audit-app";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
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
      return { user: null, isPaid: false, isSupabaseConfigured: true };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_paid")
      .eq("id", user.id)
      .maybeSingle();

    return {
      user: {
          email: user.email ?? "Signed in",
          name: user.user_metadata?.full_name,
        },
      isPaid: Boolean(profile?.is_paid),
      isSupabaseConfigured: true,
    };
  } catch {
    return { user: null, isPaid: false, isSupabaseConfigured: false };
  }
}
