"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Search, CpuIcon, CheckCircle2, FileText, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

interface FeaturesSectionProps {
  onOpenAuth?: () => void;
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ onOpenAuth }) => {
  const router = useRouter();
  const handleAction = onOpenAuth || (() => router.push("/login"));
  const features = [
    {
      badge: "Discovery",
      title: "Multi-Source Literature Search",
      description:
        "Seamlessly discover freely accessible academic literature from arXiv, PubMed, and Wikipedia in one consolidated query. Balance results across sources with instant abstract previews.",
      icon: Search,
      highlights: [
        "Concurrent querying across top open repositories",
        "Equalized multi-source distribution",
        "Direct PDF linking and automated ingestion",
      ],
    },
    {
      badge: "Management",
      title: "Isolated Workspaces & Lossless PDF Reader",
      description:
        "Organize papers into domain-specific workspaces. Review full texts with our native C++ stream-optimized PDF reader featuring page-accurate rendering and jump navigation.",
      icon: FileText,
      highlights: [
        "Multi-tenant isolated research repositories",
        "Lossless C++ pikepdf stream linearization",
        "Zero-latency page-by-page study console",
      ],
    },
    {
      badge: "Synthesis",
      title: "Grounded GenAI with Zero Hallucinations",
      description:
        "Query multi-paper consensus with AI models strictly constrained to retrieved context. Every assertion includes interactive page citations that jump directly to source text.",
      icon: CpuIcon,
      highlights: [
        "Strictly bounded retrieval-augmented generation",
        "Clickable page-level citation chips",
        "Multi-paper consensus and contradiction analysis",
      ],
    },
  ];

  return (
    <section className="w-full px-4 sm:px-6 md:px-8 py-12 sm:py-20 md:py-24">
      {/* Section Header */}
      <Reveal direction="up" delay={0}>
        <div className="text-center mx-auto max-w-3xl mb-10 sm:mb-18">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-black mb-3 sm:mb-4 px-2">
            Everything You Need for <br/> In-Depth Literature Analysis
          </h2>
          <p className="text-xs sm:text-base text-[#737373] leading-relaxed px-2">
            Designed specifically for scholars and engineers who need verifiable accuracy,
            comprehensive search, and grounded AI synthesis without fabricated citations.
          </p>
        </div>
      </Reveal>

      {/* 3 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 items-stretch">
        {features.map((f, idx) => {
          const Icon = f.icon;
          return (
            <Reveal
              key={idx}
              delay={idx * 120}
              direction="up"
              distance={24}
              className="h-full flex flex-col"
            >
              <div
                className="bg-zinc-50 border border-black/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:shadow-lg transition-all duration-300 group h-full"
              >
                <div>
                  {/* Header with Icon and Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-full bg-white border border-black/10 shadow-sm flex items-center justify-center text-[#7f1e23] group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6 text-[#7f1e23]" />
                    </div>
                    <span className="text-[11px] font-semibold text-[#737373] px-3 py-1 rounded-full bg-white border border-black/5">
                      {f.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-black mb-3 group-hover:text-[#7f1e23] transition-colors">
                    {f.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#737373] leading-relaxed mb-6 font-normal">
                    {f.description}
                  </p>

                  {/* Feature Highlights */}
                  <ul className="space-y-2.5 mb-8">
                    {f.highlights.map((h, hIdx) => (
                      <li key={hIdx} className="flex items-start gap-2.5 text-xs text-black">
                        <CheckCircle2 className="w-4 h-4 text-[#7f1e23] shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Link */}
                <button
                  type="button"
                  onClick={handleAction}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#7f1e23] hover:text-[#7f1e23]/80 transition-colors pt-4 border-t border-black/5"
                >
                  <span>Learn more</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
};

