"use client";

import { useEffect, useRef, useState } from "react";

interface RevealProps {
  children: React.ReactNode;
  /** Delay in ms before the animation kicks in once visible */
  delay?: number;
  /** Direction: from where the element fades in */
  from?: "up" | "down" | "left" | "right" | "scale";
  /** CSS class wrapper */
  className?: string;
  /** Trigger amount (0-1) — fraction of element visible before reveal */
  threshold?: number;
  /** If true, only animates once (default). If false, re-animates on scroll-in. */
  once?: boolean;
  /** Override the default duration in ms */
  duration?: number;
}

export function Reveal({
  children,
  delay = 0,
  from = "up",
  className = "",
  threshold = 0.15,
  once = true,
  duration = 700,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) obs.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once]);

  const transform = (() => {
    if (visible) return "translate3d(0,0,0) scale(1)";
    switch (from) {
      case "up": return "translate3d(0,24px,0)";
      case "down": return "translate3d(0,-24px,0)";
      case "left": return "translate3d(-24px,0,0)";
      case "right": return "translate3d(24px,0,0)";
      case "scale": return "scale(0.92)";
    }
  })();

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform,
        transition: `opacity ${duration}ms cubic-bezier(0.2,0.65,0.3,1), transform ${duration}ms cubic-bezier(0.2,0.65,0.3,1)`,
        transitionDelay: `${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
