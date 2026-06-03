import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

/**
 * Registers the device for APNs push and upserts the token into
 * `device_tokens` for the signed-in user. No-op outside Capacitor.
 */
export function usePushNotifications() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      const { PushNotifications } = await import("@capacitor/push-notifications");

      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== "granted") return;

      await PushNotifications.register();

      const reg = await PushNotifications.addListener("registration", async (token) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("device_tokens").upsert(
          {
            user_id: user.id,
            token: token.value,
            platform: "ios",
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "user_id,token" }
        );
      });

      const errReg = await PushNotifications.addListener("registrationError", (err) => {
        console.warn("[push] APNs registration error", err);
      });

      cleanup = () => {
        reg.remove();
        errReg.remove();
      };
    })();

    return () => cleanup?.();
  }, []);
}
