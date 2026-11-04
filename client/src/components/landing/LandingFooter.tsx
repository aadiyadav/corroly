"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Reveal } from "@/components/ui/Reveal";

interface LandingFooterProps {
  onOpenAuth?: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onOpenAuth }) => {
  const router = useRouter();
  const handleAction = onOpenAuth || (() => router.push("/login"));
  return (
    <footer className="w-full bg-accent/20 py-8">
      <div className="w-full max-w-7xl m-auto px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-8 sm:gap-10 pb-10 sm:pb-12 border-b border-black/5">
          {/* Brand Column (5 cols) */}
          <Reveal direction="up" delay={0} className="col-span-1 sm:col-span-2 md:col-span-5 space-y-4">
            <div className="flex items-center">
              <Logo className="w-12 h-12" size={48} />
            </div>

            <p className="text-xs sm:text-sm text-[#737373] leading-relaxed">
              An intelligent literature assistant for researchers. Search freely available academic papers across arXiv, PubMed, and Wikipedia, manage workspaces losslessly, and synthesize consensus using grounded GenAI.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleAction}
                className="text-xs font-semibold text-[#7f1e23] hover:underline"
              >
                Sign in to your workspaces &rarr;
              </button>
            </div>
          </Reveal>

          {/* Links Column: Discovery (2 cols) */}
          <Reveal direction="up" delay={80} className="col-span-1 md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-black uppercase tracking-wider">
              Discovery
            </h4>
            <ul className="space-y-2 text-xs text-[#737373]">
              <li>arXiv Preprints</li>
              <li>PubMed Central</li>
              <li>Wikipedia Knowledge</li>
              <li>Balanced Ingestion</li>
            </ul>
          </Reveal>

          {/* Links Column: Workspaces (2 cols) */}
          <Reveal direction="up" delay={160} className="col-span-1 md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-black uppercase tracking-wider">
              Management
            </h4>
            <ul className="space-y-2 text-xs text-[#737373]">
              <li>Isolated Repositories</li>
              <li>C++ pikepdf Stream</li>
              <li>Lossless PDF Viewer</li>
              <li>Page Indexing</li>
            </ul>
          </Reveal>

          {/* Links Column: Synthesis (3 cols) */}
          <Reveal direction="up" delay={240} className="col-span-1 sm:col-span-2 md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-black uppercase tracking-wider">
              Grounded GenAI
            </h4>
            <ul className="space-y-2 text-xs text-[#737373]">
              <li>Zero Hallucinations</li>
              <li>Exact Page Citations</li>
              <li>Cross-Paper Consensus</li>
              <li>Contradiction Detection</li>
            </ul>
          </Reveal>
        </div>

        {/* Bottom Credits Bar */}
        <Reveal direction="up" delay={100}>
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#737373]">
            <p>&copy; 2026 Corroly. Built for academic researchers, engineers, and scholars.</p>
            <div className="flex items-center gap-6">
              <span>Strict Page Verification</span>
              <span>Zero Hallucinations</span>
              <span>Open Access</span>
            </div>
          </div>
        </Reveal>
      </div>
    </footer>
  );
};

