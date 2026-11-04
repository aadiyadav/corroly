"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { NotebookPen, BrainCircuit, Stethoscope, Building2, Check, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

interface UseCasesSectionProps {
  onOpenAuth?: () => void;
}

export const UseCasesSection: React.FC<UseCasesSectionProps> = ({ onOpenAuth }) => {
  const router = useRouter();
  const handleAction = onOpenAuth || (() => router.push("/login"));
  const useCases = [
    {
      role: "Graduate & PhD Researchers",
      title: "Comprehensive Literature Surveys",
      description:
        "Synthesize hundreds of foundational papers without losing citation integrity. Formulate thesis literature reviews backed by verifiable page-level references.",
      icon: NotebookPen,
      tag: "Dissertation & Thesis",
    },
    {
      role: "AI & CS Engineers",
      title: "Rapid Prior-Art & Architecture Analysis",
      description:
        "Stay ahead of rapid preprint publishing on arXiv. Inspect model architectures, compare empirical benchmarks, and verify ablation findings directly on PDFs.",
      icon: BrainCircuit,
      tag: "Preprint Verification",
    },
    {
      role: "Life Sciences & Medicine",
      title: "Evidence-Based Biomedical Synthesis",
      description:
        "Query PubMed for clinical trials and meta-analyses. Compare therapeutic outcomes across multiple papers with zero risk of fabricated hallucinated statements.",
      icon: Stethoscope,
      tag: "PubMed Grounding",
    },
    {
      role: "Research Labs & Faculty",
      title: "Isolated Grant & Manuscript Workspaces",
      description:
        "Organize lab initiatives into clean workspaces. Accelerate grant writing, verify citation accuracy, and ensure all team assertions reference primary literature.",
      icon: Building2,
      tag: "Lab Collaboration",
    },
  ];

  return (
    <section className="w-full px-4 sm:px-6 md:px-8 py-10 sm:py-16">
      {/* Section Header */}
      <Reveal direction="up" delay={0}>
        <div className="text-center mx-auto max-w-3xl mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-black mb-3 sm:mb-4 px-2">
            Built for Rigorous Scientific Workflows
          </h2>
          <p className="text-xs sm:text-base text-[#737373] leading-relaxed px-2">
            From early-stage literature exploration to manuscript preparation, Corroly empowers
            scholars with speed and verifiable page citations.
          </p>
        </div>
      </Reveal>

      {/* 2x2 Responsive Use Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 mb-12 sm:mb-16 items-stretch">
        {useCases.map((u, idx) => {
          const Icon = u.icon;
          return (
            <Reveal
              key={idx}
              delay={(idx % 2) * 120}
              direction="up"
              distance={24}
              className="h-full flex flex-col"
            >
              <div
                className="bg-zinc-50 border border-black/10 rounded-2xl sm:rounded-3xl p-6 sm:p-9 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group h-full"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-white border border-black/10 shadow-sm flex items-center justify-center text-[#7f1e23] group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6 text-[#7f1e23]" />
                    </div>
                    <span className="text-[11px] font-semibold text-[#7f1e23] px-3 py-1 rounded-full bg-[#ffd4a5]/40 border border-[#ffd4a5]">
                      {u.tag}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-1.5">
                    {u.role}
                  </div>
                  <h3 className="text-lg font-bold text-black mb-3 group-hover:text-[#7f1e23] transition-colors">
                    {u.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#737373] leading-relaxed mb-6 font-normal">
                    {u.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-black/5 flex items-center justify-between">
                  <span className="text-xs font-medium text-black flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#7f1e23]" />
                    <span>Strict Source Citations</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAction}
                    className="text-xs font-semibold text-[#7f1e23] flex items-center gap-1 hover:underline"
                  >
                    <span>Explore workspace</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* Big Action Callout Card */}
      <Reveal direction="up" delay={80} distance={20}>
        <div className="w-full py-8 text-center relative overflow-hidden">
          <div className="w-full mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-black/10 text-xs font-semibold text-black mb-4 shadow-sm">
              <span>Free For Academic Research</span>
            </div>
            <h3 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-black tracking-tight mb-3 sm:mb-4">
              Accelerate Your Literature Review Today
            </h3>
            <p className="text-xs sm:text-sm text-[#737373] leading-relaxed mb-6 sm:mb-8 font-normal mx-auto px-2">
              Query arXiv, PubMed, and Wikipedia. Ingest full PDFs, study them losslessly, and build
              verifiable synthesis reports in minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleAction}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#7f1e23] hover:bg-[#7f1e23]/90 text-white text-xs sm:text-sm font-semibold transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
};

