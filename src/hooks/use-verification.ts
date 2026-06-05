import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VerificationStatus = "verified" | "pending" | "unverified";

export type VerificationState = {
  loading: boolean;
  verified: boolean;
  status: VerificationStatus;
};

export function useVerification(): VerificationState {
  const [state, setState] = useState<VerificationState>({
    loading: true,
    verified: false,
    status: "unverified",
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (alive) setState({ loading: false, verified: false, status: "unverified" });
        return;
      }
      const [{ data: prof }, { data: vr }] = await Promise.all([
        supabase.from("profiles").select("verified").eq("id", user.id).maybeSingle(),
        supabase.from("verification_requests").select("status").eq("user_id", user.id).maybeSingle(),
      ]);
      const isVerified = !!prof?.verified;
      let status: VerificationStatus = "unverified";
      if (isVerified) status = "verified";
      else if (vr && ["submitted", "pending_review"].includes(vr.status as string)) status = "pending";
      if (alive) setState({ loading: false, verified: isVerified, status });
    })();
    return () => { alive = false; };
  }, []);

  return state;
}
