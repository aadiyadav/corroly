"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

interface SmoothScrollProps {
  children: React.ReactNode;
}

export const SmoothScroll: React.FC<SmoothScrollProps> = ({ children }) => {
  const pathname = usePathname();

  useEffect(() => {
    // Only initialize smooth inertial scrolling in browser environments on the landing page
    // App pages (/repositories, /[workspaceSlug], etc.) require native multi-pane scrolling
    if (typeof window === "undefined" || pathname !== "/") return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
      prevent: (node: HTMLElement) => {
        return Boolean(
          node.hasAttribute?.("data-lenis-prevent") ||
          node.classList?.contains("overflow-y-auto") ||
          node.classList?.contains("overflow-auto") ||
          node.closest?.("[data-lenis-prevent], .overflow-y-auto, .overflow-auto")
        );
      },
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, [pathname]);

  return <>{children}</>;
};

