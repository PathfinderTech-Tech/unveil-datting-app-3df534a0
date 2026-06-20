import { ReactNode } from "react";
import { UnveilNav } from "./UnveilNav";
import { PageBackButton } from "./PageBackButton";

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <UnveilNav />
      <article className="mx-auto max-w-3xl px-6 py-16">
        <PageBackButton fallback="/settings" className="mb-6" />
        <h1 className="font-display text-4xl font-light md:text-5xl">{title}</h1>
        {updated && (
          <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p>
        )}
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-foreground/85">
          {children}
        </div>
      </article>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-light text-foreground">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}
