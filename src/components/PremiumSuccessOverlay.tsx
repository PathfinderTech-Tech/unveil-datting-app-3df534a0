"use client";

import React, { useEffect, useState } from "react";
import { Check, Crown, Ticket, Zap } from "lucide-react";

type ProductKey = "premium" | "premium_quarterly" | "premium_annual" | "message_pass" | "message_pass_2w";

interface PremiumSuccessOverlayProps {
  product?: ProductKey;
  onComplete?: () => void;
  duration?: number;
}

const HEADLINE: Record<ProductKey, { title: string; icon: React.ReactNode }> = {
  message_pass: { title: "Pass Activated", icon: <Ticket className="h-7 w-7" /> },
  message_pass_2w: { title: "Pass Activated", icon: <Ticket className="h-7 w-7" /> },
  premium: { title: "Premium Unlocked", icon: <Crown className="h-7 w-7" /> },
  premium_quarterly: { title: "Premium Unlocked", icon: <Crown className="h-7 w-7" /> },
  premium_annual: { title: "Premium Unlocked", icon: <Crown className="h-7 w-7" /> },
};

const SUBTEXT: Record<ProductKey, string> = {
  message_pass: "Your 24-Hour Pass is now active. Enjoy unlimited messaging.",
  message_pass_2w: "Your 2-Week Pass is now active. Enjoy unlimited messaging.",
  premium: "Welcome to UNVEIL Premium. Your membership is now live.",
  premium_quarterly: "Welcome to UNVEIL Premium. Your 3-month membership is now live.",
  premium_annual: "Welcome to UNVEIL Premium. Your annual membership is now live.",
};

/**
 * CSS-driven confetti particles — no extra dependencies, works everywhere.
 */
function ConfettiBurst() {
  const particles = React.useMemo(() => {
    const colors = ["#F0A020", "#D955A0", "#7B3FC4", "#1B6FE8", "#F070B0", "#FFD700"];
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 6 + 4,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: Math.random() * 1.2 + 1.0,
      dx: (Math.random() - 0.5) * 240,
      dy: -(Math.random() * 200 + 100),
      rot: (Math.random() - 0.5) * 720,
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.left}%`,
            bottom: "40%",
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--dx" as string]: `${p.dx}px`,
            ["--dy" as string]: `${p.dy}px`,
            ["--rot" as string]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}

export default function PremiumSuccessOverlay({
  product,
  onComplete,
  duration = 2200,
}: PremiumSuccessOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setCompleting(true);
      onComplete?.();
    }, duration);
    return () => clearTimeout(t);
  }, [visible, duration, onComplete]);

  const meta = product ? HEADLINE[product] : { title: "Welcome", icon: <Zap className="h-7 w-7" /> };
  const sub = product ? SUBTEXT[product] : "Your purchase is confirmed.";

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-700 ${
        visible && !completing ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: "radial-gradient(circle at 50% 50%, #09070d 0%, #000 100%)" }}
    >
      <ConfettiBurst />

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Gold ring + checkmark */}
        <div className="success-check-wrap">
          <div className="success-ring" />
          <div className="success-check">
            <Check className="h-10 w-10 text-[#0a0612]" strokeWidth={3} />
          </div>
        </div>

        {/* Headline */}
        <h2
          className={`mt-8 font-display text-3xl sm:text-4xl font-light tracking-tight text-gradient-hero transition-all duration-700 ${
            visible ? "success-text-in" : "opacity-0 translate-y-4"
          }`}
        >
          {meta.title}
        </h2>

        {/* Subtext */}
        <p
          className={`mt-3 max-w-sm text-sm sm:text-base text-muted-foreground transition-all duration-700 delay-200 ${
            visible ? "success-text-in" : "opacity-0 translate-y-4"
          }`}
        >
          {sub}
        </p>

        {/* Premium badge */}
        <div
          className={`mt-6 inline-flex items-center gap-2 rounded-full border border-[#F0A020]/30 bg-[#F0A020]/8 px-4 py-2 transition-all duration-700 delay-300 ${
            visible ? "success-text-in" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="text-[#F0A020]">{meta.icon}</span>
          <span className="text-xs font-medium tracking-wide text-[#F0A020]">UNVEIL {meta.title}</span>
        </div>
      </div>
    </div>
  );
}
