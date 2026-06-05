import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  useChemistry,
  relativeDate,
  TIER_META,
  GAMES,
  sumGame,
  SESSION_MAX,
  type SessionRecord,
  type GameResult,
} from "@/lib/chemistry-ledger";

const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));

export function ChemistrySessionList() {
  const data = useChemistry();
  const sessions = data?.sessions ?? [];
  const [openId, setOpenId] = useState<string | null>(sessions[0]?.id ?? null);

  if (!data || sessions.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-foreground">
          Session History
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {sessions.length} session{sessions.length === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="space-y-2">
        {sessions.map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            open={openId === s.id}
            onToggle={() => setOpenId(openId === s.id ? null : s.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function SessionRow({
  session,
  open,
  onToggle,
}: {
  session: SessionRecord;
  open: boolean;
  onToggle: () => void;
}) {
  const tierMeta = TIER_META[session.tier];
  return (
    <li
      className="overflow-hidden rounded-xl border border-border bg-background"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                background: "color-mix(in oklch, var(--primary) 14%, transparent)",
                color: "var(--primary)",
                border: "1px solid color-mix(in oklch, var(--primary) 35%, transparent)",
              }}
            >
              {tierMeta.emoji} {session.tier}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {session.score} / {SESSION_MAX}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {relativeDate(session.date)}
          </div>
        </div>
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform"
          style={{
            color: "var(--muted-foreground)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <div
          className="border-t px-4 py-3"
          style={{ borderColor: "var(--border)", background: "var(--logo-ink)" }}
        >
          {session.results.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              No per-game breakdown stored for this session.
            </p>
          ) : (
            <ul className="space-y-2">
              {session.results.map((r, i) => (
                <GameRow key={`${r.id}-${i}`} result={r} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function GameRow({ result }: { result: GameResult }) {
  const meta = GAME_BY_ID[result.id];
  const total = sumGame(result);
  return (
    <li className="rounded-lg bg-surface/60 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm text-foreground">
          <span>{meta?.emoji}</span>
          <span className="truncate">{meta?.name ?? result.id}</span>
        </span>
        {result.skipped ? (
          <span className="font-mono text-[11px] text-muted-foreground">
            Skipped
          </span>
        ) : (
          <span className="font-mono text-[11px] text-primary">
            +{total}
          </span>
        )}
      </div>
      {!result.skipped && result.bonuses.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1 pl-6">
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px]"
            style={{ background: "color-mix(in oklch, var(--foreground) 5%, transparent)", color: "var(--muted-foreground)" }}
          >
            base +{result.base}
          </span>
          {result.bonuses.map((b, i) => (
            <span
              key={i}
              className="rounded-full px-1.5 py-0.5 text-[10px]"
              style={{
                background: "color-mix(in oklch, var(--primary) 14%, transparent)",
                color: "var(--primary)",
                border: "1px solid color-mix(in oklch, var(--primary) 35%, transparent)",
              }}
            >
              +{b.points} {b.label}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}
