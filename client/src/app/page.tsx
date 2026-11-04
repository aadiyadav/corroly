"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store";
import { Navbar } from "@/components/navigation/Navbar";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { UseCasesSection } from "@/components/landing/UseCasesSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Reveal } from "@/components/ui/Reveal";
import {
  Check,
  Clock,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAppSelector(
    (state) => state.auth
  );

  // If already authenticated, smoothly redirect to the dedicated /repositories route
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace("/repositories");
    }
  }, [isInitialized, isAuthenticated, router]);

  // While redirecting an authenticated user to /repositories, avoid flashing landing content
  if (isAuthenticated) {
    return null;
  }

  const handleOpenLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col selection:bg-[#ffd4a5] selection:text-black">
      {/* Header / Navbar: Sits outside the textured bg, and has NO border */}
      <Navbar onOpenAuth={handleOpenLogin} />

      {/* Main Page Container: Has a border as well as a subtle textured bg */}
      <div className="w-full px-3 sm:px-6 md:px-8 pb-4 sm:pb-8 flex flex-col">
        <Reveal direction="up" delay={0} duration={1000} distance={16} width="full">
          <main className="w-full min-h-[auto] xl:min-h-[calc(100vh-6.5rem)] bg-zinc-50 textured-dot-bg rounded-2xl sm:rounded-3xl md:rounded-[36px] border border-black/10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden relative flex flex-col justify-center sm:py-14 md:py-16 px-4 sm:px-8 md:px-14">
            
            {/* Floating Decorative Card: Top-Left Note Card (STRICT 5 COLORS: Peach #ffd4a5, Crimson #7f1e23, Black, White) */}
            <Reveal
              direction="right"
              delay={200}
              distance={24}
              className="hidden xl:block absolute left-12 top-10 select-none pointer-events-none"
            >
              <div className="relative w-56 -rotate-6 transition-transform hover:-translate-y-1">
                {/* Peach note */}
                <div className="bg-[#ffd4a5]/40 rounded-2xl p-4 shadow-[0_12px_28px_rgba(0,0,0,0.08)] border border-[#ffd4a5] text-left relative">
                  {/* Crimson pin at top */}
                  <div className="w-3.5 h-3.5 rounded-full bg-[#7f1e23] shadow-sm ring-2 ring-white absolute -top-1.5 left-1/2 -translate-x-1/2" />
                  <p className="text-[11px] text-black leading-relaxed font-medium italic mt-1">
                    Take notes to keep track of crucial citations, and synthesize literature with ease.
                  </p>
                </div>
                {/* Overlapping Crimson check badge */}
                <div className="absolute -bottom-3 -right-3 bg-white rounded-full p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.10)] border border-black/5">
                  <div className="w-9 h-9 rounded-full bg-[#7f1e23] flex items-center justify-center text-white shadow-sm">
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Floating Decorative Card: Top-Right Reminders / Consensus Card (STRICT 5 COLORS: White, Black, Crimson, Muted Gray) */}
            <Reveal
              direction="left"
              delay={240}
              distance={24}
              className="hidden xl:block absolute right-12 top-10 select-none pointer-events-none"
            >
              <div className="relative w-56 rotate-6 transition-transform hover:-translate-y-1">
                <div className="bg-white rounded-2xl p-4 shadow-[0_16px_36px_rgba(0,0,0,0.10)] border border-black/5 text-left">
                  <div className="text-[11px] font-bold text-black mb-2">Reminders</div>
                  <div className="bg-[#f5f5f5] rounded-xl p-2.5 border border-black/5">
                    <div className="text-[10px] font-semibold text-black">Consensus Synthesis</div>
                    <div className="text-[9px] text-[#737373] mt-0.5">Literature agreement review</div>
                    <div className="text-[9px] text-[#7f1e23] font-medium mt-1.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-[#7f1e23]" />
                      <span>13:00 - 13:45</span>
                    </div>
                  </div>
                </div>
                {/* Overlapping clock icon card */}
                <div className="absolute -top-5 -right-4 bg-white rounded-full p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.10)] border border-black/5">
                  <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center text-black">
                    <Clock className="w-5 h-5 text-black" />
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Floating Decorative Card: Bottom-Left Today's Tasks (STRICT 5 COLORS: White, Black, Crimson, Peach, Muted Gray) */}
            <Reveal
              direction="right"
              delay={280}
              distance={24}
              className="hidden xl:block absolute left-12 bottom-10 select-none pointer-events-none"
            >
              <div className="w-56 rotate-3 bg-white rounded-2xl p-4 shadow-[0_16px_36px_rgba(0,0,0,0.10)] border border-black/5 text-left transition-transform hover:-translate-y-1">
                <div className="text-[11px] font-bold text-black mb-3">Today's research</div>
                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-medium text-black mb-1">
                      <span className="truncate">Attention Is All You Need</span>
                      <span className="text-[#737373]">100%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#f5f5f5] overflow-hidden">
                      <div className="h-full rounded-full bg-[#7f1e23] w-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-medium text-black mb-1">
                      <span className="truncate">Computing Machinery 1950</span>
                      <span className="text-[#737373]">60%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#f5f5f5] overflow-hidden">
                      <div className="h-full rounded-full bg-[#ffd4a5] w-[60%]" />
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Floating Decorative Card: Bottom-Right Multi-Source Ingestion (STRICT 5 COLORS: White, Black, Crimson, Peach, Muted Gray) */}
            <Reveal
              direction="left"
              delay={320}
              distance={24}
              className="hidden xl:block absolute right-12 bottom-10 select-none pointer-events-none"
            >
              <div className="w-56 -rotate-3 bg-white rounded-2xl p-4 shadow-[0_16px_36px_rgba(0,0,0,0.10)] border border-black/5 text-left transition-transform hover:-translate-y-1">
                <div className="text-[11px] font-bold text-black mb-2">Ingestion Sources</div>
                <ul className="space-y-1 text-xs">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#7f1e23] shrink-0" />
                    <span className="text-[11px] font-medium text-black">arXiv</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ffd4a5] border border-black/10 shrink-0" />
                    <span className="text-[11px] font-medium text-black">PubMed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-black shrink-0" />
                    <span className="text-[11px] font-medium text-black">Wikipedia</span>
                  </li>
                </ul>
              </div>
            </Reveal>

            {/* Hero Content Area */}
            <div className="flex flex-col items-center justify-center text-center my-auto z-10 py-4 sm:py-6 md:py-8 max-w-3xl self-center">
              {/* Logo */}
              <Reveal direction="up" delay={80} distance={18}>
                <Logo className="w-32 h-32" />
              </Reveal>

              {/* Main Title matching reference headline styling */}
              <Reveal direction="up" delay={160} distance={18}>
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-black leading-[1.15] sm:leading-[1.08] my-4 sm:my-8 px-1 uppercase">
                  Think, plan, and track <br className="hidden sm:inline" />
                </h1>
              </Reveal>

              {/* Subtitle */}
              <Reveal direction="up" delay={240} distance={18}>
                <p className="text-xs sm:text-base md:text-lg text-[#737373] mx-auto mb-6 sm:mb-8 font-normal leading-relaxed px-2">
                  A comprehensive platform for researchers to efficiently search freely available academic literature, organize workspaces losslessly, and analyze papers using grounded GenAI with zero hallucinations.
                </p>
              </Reveal>

              {/* Primary CTA Button: Crimson (#7f1e23) with white text */}
              <Reveal direction="up" delay={320} distance={18}>
                <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleOpenLogin}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#7f1e23] hover:bg-[#7f1e23]/90 text-white text-xs sm:text-sm font-semibold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>Get Started</span>
                  </button>
                </div>
              </Reveal>

              {/* Mobile / Tablet Capability Preview (< xl) */}
              <div className="xl:hidden mt-10 sm:mt-12 w-full mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <Reveal direction="up" delay={120} className="h-full">
                  <div className="bg-[#ffd4a5]/40 rounded-2xl p-3.5 border border-[#ffd4a5] shadow-sm flex items-center gap-2.5 h-full">
                    <div className="w-7 h-7 rounded-lg bg-[#7f1e23] flex items-center justify-center text-white shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-black">Lossless Citations</div>
                      <p className="text-[11px] text-[#737373] mt-0.5 leading-snug">
                        Zero hallucinations, page-accurate citations.
                      </p>
                    </div>
                  </div>
                </Reveal>

                <Reveal direction="up" delay={180} className="h-full">
                  <div className="bg-white rounded-2xl p-3.5 border border-black/5 shadow-sm flex items-center gap-2.5 h-full">
                    <div className="w-7 h-7 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-black shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-black" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-black">Consensus Engine</div>
                      <p className="text-[11px] text-[#737373] mt-0.5 leading-snug">
                        Multi-paper agreement and contradiction analysis.
                      </p>
                    </div>
                  </div>
                </Reveal>

                <Reveal direction="up" delay={240} className="h-full">
                  <div className="bg-white rounded-2xl p-3.5 border border-black/5 shadow-sm h-full flex flex-col justify-center">
                    <div className="flex items-center justify-between text-xs font-bold text-black mb-1.5">
                      <span>Literature Progress</span>
                      <span className="text-[10px] text-[#7f1e23] font-semibold">100% Grounded</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#f5f5f5] overflow-hidden">
                      <div className="h-full rounded-full bg-[#7f1e23] w-full" />
                    </div>
                  </div>
                </Reveal>

                <Reveal direction="up" delay={300} className="h-full">
                  <div className="bg-white rounded-2xl p-3.5 border border-black/5 shadow-sm flex items-center justify-between h-full">
                    <span className="text-xs font-bold text-black">Active Ingestion</span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-[#f5f5f5] text-[10px] font-bold text-[#7f1e23]">arXiv</span>
                      <span className="px-2 py-0.5 rounded-md bg-[#f5f5f5] text-[10px] font-bold text-black">PubMed</span>
                      <span className="px-2 py-0.5 rounded-md bg-[#f5f5f5] text-[10px] font-bold text-[#737373]">Wiki</span>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </main>
        </Reveal>
      </div>

      {/* Features Section */}
      <FeaturesSection onOpenAuth={handleOpenLogin} />

      {/* Use Cases Section */}
      <UseCasesSection onOpenAuth={handleOpenLogin} />

      {/* Landing Footer */}
      <LandingFooter onOpenAuth={handleOpenLogin} />
    </div>
  );
}
