import { Link } from "@tanstack/react-router";
import { Home, RefreshCw } from "lucide-react";
import { UnveilNav } from "@/components/UnveilNav";

export function RouteErrorScreen({
  title,
  message,
  homeTo = "/discover",
  error,
}: {
  title: string;
  message: string;
  homeTo?: string;
  error: Error;
}) {
  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="rounded-3xl border border-primary/20 bg-card/95 p-8 shadow-glow">
          <h1 className="font-display text-3xl text-foreground">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-hero px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition-opacity hover:opacity-95"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
            <Link
              to={homeTo}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-primary/35 bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/15 hover:text-primary"
            >
              <Home className="h-4 w-4" /> Go Home
            </Link>
            <a
              href="mailto:support@unveil.best?subject=UNVEIL%20Issue%20Report"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary/10"
            >
              Report Issue
            </a>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-6 overflow-auto rounded-2xl border border-border bg-background/60 p-4 text-left text-xs text-muted-foreground">
              {error.name}: {error.message}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
