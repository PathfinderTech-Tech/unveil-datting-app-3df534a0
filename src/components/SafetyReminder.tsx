import { ShieldAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function SafetyReminder({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
        <div className="text-sm">
          <div className="font-display font-medium text-foreground">For your safety</div>
          <p className="mt-1 text-muted-foreground">
            Always meet in public places, tell a friend your plans, and take your time getting to know someone.
          </p>
          {!compact && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <Link to="/safety" className="text-amber-400 underline">Safety center</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
