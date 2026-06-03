import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Registers the device for APNs push notifications when running inside the
 * Capacitor iOS shell. No-op in the browser.
 *
 * To enable end-to-end push delivery, create a `device_tokens` table in
 * Lovable Cloud and uncomment the `supabase.from(...)` insert below.
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
        // const { supabase } = await import("@/integrations/supabase/client");
        // const { data: { user } } = await supabase.auth.getUser();
        // if (user) {
        //   await supabase.from("device_tokens").upsert({
        //     user_id: user.id,
        //     token: token.value,
        //     platform: "ios",
        //   });
        // }
        console.info("[push] APNs token", token.value);
      });

      const errReg = await PushNotifications.addListener("registrationError", (err) => {
        console.warn("[push] registration error", err);
      });

      cleanup = () => {
        reg.remove();
        errReg.remove();
      };
    })();

    return () => cleanup?.();
  }, []);
}
