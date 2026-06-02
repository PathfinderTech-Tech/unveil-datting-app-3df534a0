import { createFileRoute, Link } from "@tanstack/react-router";
import { UnveilNav } from "@/components/UnveilNav";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — UNVEIL" }] }),
  component: Settings,
});

function Settings() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-2xl px-5 py-14">
        <h1 className="font-display text-4xl font-light">{t("common.settings")}</h1>
        <div className="mt-8 space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">{t("common.language")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Change the interface language anytime.</p>
            <div className="mt-4"><LanguageSwitcher /></div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">{t("premium.manageSubscription")}</h2>
            <Link to="/manage-subscription" className="mt-3 inline-flex rounded-full bg-gradient-hero px-5 py-2 text-xs font-medium text-primary-foreground shadow-glow">
              {t("premium.manageSubscription")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
