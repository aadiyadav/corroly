# Research Paper Synthesizer (ResearchBuddy)
## UI/UX Design System, Component Specifications & Master Stylesheet

*Document Identifier:* `UI-SPEC-005`  
*Version:* `2.0.0`  
*Status:* Approved for Implementation  
*Visual Theme:* Light Mode (Strict 5-Color System: Black, White, `#7f1e23`, `#ffd4a5`, `#737373`)  
*Primary Font:* Geist (Google Fonts) applied globally on `body` (Zero Monospace fonts)  
*Styling Paradigm:* Pure In-Built Tailwind CSS utilities (No custom CSS classes, no borders)  
*Iconography:* Lucide React (Strict Purpose-Driven, Zero Sparkle Icons)  
*Stylesheet Architecture:* Single Project CSS (`src/app/index.css`) with Strict 3-Tier Responsive Breakpoints  

---

## Table of Contents
1. [Design Philosophy & Visual Reference Alignment](#1-design-philosophy--visual-reference-alignment)
2. [Strict 5-Color Palette & Zero-Border Architecture](#2-strict-5-color-palette--zero-border-architecture)
3. [Typography Hierarchy (Geist Font Only)](#3-typography-hierarchy-geist-font-only)
4. [Strict 3-Tier Responsive Breakpoint System](#4-strict-3-tier-responsive-breakpoint-system)
5. [In-Built Tailwind Component Specifications](#5-in-built-tailwind-component-specifications)
6. [Tactile Micro-Interactions & Animation Guidelines](#6-tactile-micro-interactions--animation-guidelines)
7. [Iconography Rules (Lucide React & Zero-Sparkles Policy)](#7-iconography-rules-lucide-react--zero-sparkles-policy)
8. [Core Screens & Layout Wireframes](#8-core-screens--layout-wireframes)
9. [The Single Master `index.css` Stylesheet](#9-the-single-master-indexcss-stylesheet)

---

## 1. Design Philosophy & Visual Reference Alignment

ResearchBuddy adopts a **modern, tactile, light-themed academic workspace** inspired by editorial SaaS interfaces:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         CORE VISUAL IDENTITY PILLARS                             │
├─────────────────────┬──────────────────────┬─────────────────────────────────────┤
│ 1. FLOATING PILLS   │ 2. WARM ACCENT DEPTH │ 3. ZERO-BORDER ELEVATION            │
│ Floating navigation │ White canvas, warm   │ No borders anywhere. Depth and      │
│ capsules, pill      │ peach (#ffd4a5) and  │ separation achieved purely via      │
│ badges, buttons     │ crimson (#7f1e23)    │ Tailwind shadows (shadow-md/lg)     │
│ (rounded-full)      │ focal points         │ and background color contrast       │
└─────────────────────┴──────────────────────┴─────────────────────────────────────┘
```

### 1.1 Visual Elements Derived from Design References
* **Floating Capsule Navigation:** Floating navigation bar with `rounded-full`, soft diffused drop shadow (`shadow-lg`), and crisp white background.
* **Warm Contrast & Pill Badges:** Accent badges, tags, and citation chips utilize warm peach (`#ffd4a5`) with deep crimson (`#7f1e23`) labels.
* **Generous Geometry & No Borders:** High-radius containers (`rounded-3xl` and `rounded-2xl`). **Borders are completely eliminated across the entire platform** (if strictly required for input focus or accessibility, only pure black or white is permitted).
* **Unified Geist Typography:** Clean, modern, highly legible sans-serif type ([Geist](https://fonts.google.com/specimen/Geist)) applied globally to the `body` tag. No monospace or alternative fonts are used.

---

## 2. Strict 5-Color Palette & Zero-Border Architecture

The platform strictly utilizes **only five colors**. All intermediate tints, borders, and extra shades are completely eliminated:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               STRICT 5-COLOR SYSTEM                                    │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────────────────┤
│ BLACK        │ WHITE        │ CRIMSON      │ WARM PEACH   │ MUTED GRAY                 │
│ #000000      │ #ffffff      │ #7f1e23      │ #ffd4a5      │ #737373                    │
│ Primary text,│ Canvas,      │ Primary CTA, │ Secondary    │ Subtitles, timestamps,     │
│ high-contrast│ card bg,     │ active state,│ accent,      │ author lists, inactive     │
│ buttons      │ button text  │ brand accent │ citation pill│ icons, placeholders        │
└──────────────┴──────────────┴──────────────┴──────────────┴────────────────────────────┘
```

### 2.1 Color Application Matrix

| Color | Hex Value | Primary Tailwind Application | Usage Rules |
| :--- | :--- | :--- | :--- |
| **Black** | `#000000` / `#0a0a0a` | `text-black`, `bg-black`, `border-black` (if required) | Headlines, primary text, high-contrast buttons. |
| **White** | `#ffffff` | `bg-white`, `text-white`, `border-white` (if required) | Background canvas, card surfaces, modal sheets, button text. |
| **Deep Crimson** | `#7f1e23` | `bg-[#7f1e23]`, `text-[#7f1e23]` | Primary action buttons, active tab indicators, major CTA focus. |
| **Warm Peach** | `#ffd4a5` | `bg-[#ffd4a5]`, `text-[#ffd4a5]` | Citation badges, highlight tags, pill chips, citation focus flash. |
| **Muted Gray** | `#737373` | `text-[#737373]`, `bg-[#737373]` | Author lists, timestamps, paper DOIs, input placeholders. |

### 2.2 The Zero-Border Policy
> [!IMPORTANT]
> **NO BORDERS ACROSS THE ENTIRE PLATFORM.**
> Cards, pills, modals, inputs, and tables must **not** have borders (`border-0`). Visual hierarchy and element separation are created exclusively through:
> 1. Background contrast (e.g., pure white cards on warm surfaces, or peach `#ffd4a5` chips).
> 2. Tailwind's in-built drop shadows (`shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`).
> 3. Generous whitespace and padding.
> *(If a border is strictly required for accessibility or focused states, only `border-black` or `border-white` may be used).*

---

## 3. Typography Hierarchy (Geist Font Only)

ResearchBuddy exclusively uses **Geist** loaded from Google Fonts. **Geist Mono is completely removed.**

### 3.1 Font Import & Global Application
In `src/app/index.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');

body {
  font-family: 'Geist', sans-serif;
  background-color: #ffffff;
  color: #000000;
}
```

### 3.2 Type Scale (Pure Tailwind Utilities)

| Role | Tailwind Classes | Weight | Application |
| :--- | :--- | :--- | :--- |
| **Display Hero** | `text-4xl md:text-5xl font-bold tracking-tight text-black` | `700` | Landing headline, major workspace banner. |
| **Heading 1** | `text-2xl md:text-3xl font-semibold tracking-tight text-black` | `600` | Active repository title, Discovery header. |
| **Heading 2** | `text-xl md:text-2xl font-semibold text-black` | `600` | Paper card titles, Reader document title. |
| **Heading 3** | `text-lg font-semibold text-black` | `600` | Section subheadings, modal group labels. |
| **Body Regular** | `text-base font-normal leading-relaxed text-black` | `400` | AI synthesized answers, paper abstracts. |
| **Body Small** | `text-sm font-normal text-[#737373]` | `400` | Author lists, timestamps, citations count. |
| **Pill / Button**| `text-sm font-medium tracking-wide` | `500` | Capsule buttons, category pills, tab labels. |
| **Citation Tag** | `text-xs font-semibold tracking-wider` | `600` | `[Doc: Attention, Page: 4]` badge text. |

---

## 4. Strict 3-Tier Responsive Breakpoint System

The application strictly implements **exactly three screen sizes** without extra intermediate breakpoints:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         STRICT 3-TIER RESPONSIVE GRID                            │
├─────────────────────┬──────────────────────┬─────────────────────────────────────┤
│ 1. DESKTOP          │ 2. TABLET            │ 3. MOBILE                           │
│ Viewport: > md      │ Viewport: sm to md   │ Viewport: < sm                      │
│ Min-Width: > 768px  │ Width: 640px - 768px │ Max-Width: < 640px                  │
├─────────────────────┼──────────────────────┼─────────────────────────────────────┤
│ • Full side-by-side │ • Stacked split pane │ • Single column stacked             │
│   split workspace   │   or tabbed toggle   │ • Bottom drawer modal sheets        │
│ • Persistent reader │ • Drawer chat panel  │ • Floating action button triggers   │
│ • Floating pill bar │ • Compact pill bar   │ • Compact mobile bottom bar         │
└─────────────────────┴──────────────────────┴─────────────────────────────────────┘
```

### 4.1 Responsive Behavior by Tier

1. **Desktop (`> md` / `min-width: 769px`):**
   * Workspace layout: Side-by-side two-pane split screen (`grid grid-cols-12`). Left pane: PDF Reader (`col-span-7`); Right pane: Chat Console (`col-span-5`).
   * Navigation: Centered floating pill header (`w-full max-w-5xl mx-auto`).
2. **Tablet (`sm to md` / `640px - 768px`):**
   * Workspace layout: Tabbed switcher or vertically stacked layout (`flex flex-col gap-4`).
   * Navigation: Compact floating pill bar spanning `w-[95%] mx-auto`.
3. **Mobile (`< sm` / `max-width: 639px`):**
   * Workspace layout: Single focused view. Reader displays full-width; citations open in a bottom slide-up sheet.
   * Navigation: Fixed bottom bar (`fixed bottom-0 left-0 right-0 h-16 bg-white shadow-xl flex items-center justify-around`).

---

## 5. In-Built Tailwind Component Specifications

All components rely on **in-built Tailwind CSS classes** and standard Tailwind utility values (`shadow-*`, `rounded-*`). No custom CSS classes are required.

### 5.1 Floating Capsule Header (`rounded-full shadow-lg`)
```tsx
<header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
  <nav className="w-full max-w-4xl bg-white rounded-full px-6 py-3 shadow-lg flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-[#7f1e23] flex items-center justify-center text-white font-bold text-sm">
        RB
      </div>
      <span className="font-semibold text-black tracking-tight">ResearchBuddy</span>
    </div>
    
    <div className="hidden md:flex items-center gap-2">
      <button className="px-4 py-2 rounded-full text-sm font-medium text-black hover:bg-[#ffd4a5] transition-all duration-200">
        Workspaces
      </button>
      <button className="px-4 py-2 rounded-full text-sm font-medium text-black hover:bg-[#ffd4a5] transition-all duration-200">
        Discovery
      </button>
    </div>

    <button className="bg-[#7f1e23] text-white px-5 py-2 rounded-full text-sm font-medium shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95">
      New Workspace
    </button>
  </nav>
</header>
```

---

### 5.2 Primary & Secondary Buttons
```tsx
{/* Primary Crimson CTA Button */}
<button className="bg-[#7f1e23] text-white px-6 py-3 rounded-full text-sm font-medium shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center gap-2">
  <Search className="w-4 h-4" />
  <span>Ingest Papers</span>
</button>

{/* Secondary White Button */}
<button className="bg-white text-black px-6 py-3 rounded-full text-sm font-medium shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center gap-2">
  <span>Cancel</span>
</button>

{/* Accent Peach Button */}
<button className="bg-[#ffd4a5] text-[#7f1e23] px-6 py-3 rounded-full text-sm font-semibold shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-95 flex items-center gap-2">
  <span>View Citation</span>
</button>
```

---

### 5.3 Grounded Interactive Citation Chip
```tsx
<button
  onClick={() => jumpToPdfPage(4)}
  className="bg-[#ffd4a5] text-[#7f1e23] px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition-all duration-150 hover:-translate-y-0.5 active:scale-95 cursor-pointer mx-1"
>
  <span>Doc: Attention Is All You Need, P. 4</span>
</button>
```

---

### 5.4 Research Workspace Card (`rounded-3xl shadow-md`)
```tsx
<div className="bg-white rounded-3xl p-6 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between">
  <div>
    <div className="flex items-center justify-between mb-3">
      <span className="bg-[#ffd4a5] text-[#7f1e23] px-3 py-1 rounded-full text-xs font-semibold">
        Active Workspace
      </span>
      <span className="text-xs text-[#737373]">Updated 2h ago</span>
    </div>
    <h3 className="text-xl font-semibold text-black mb-2">
      Transformer Architectures & Attention
    </h3>
    <p className="text-sm text-[#737373] line-clamp-2">
      Foundational literature analyzing attention mechanisms and scaling laws.
    </p>
  </div>
  
  <div className="mt-6 flex items-center justify-between">
    <span className="text-xs font-medium text-[#737373]">4 Papers Ingested</span>
    <button className="bg-[#7f1e23] text-white px-4 py-2 rounded-full text-xs font-medium shadow transition-all duration-150 hover:-translate-y-0.5 active:scale-95">
      Open Workspace
    </button>
  </div>
</div>
```

---

### 5.5 Form Inputs & Search Bars (Zero Borders)
```tsx
<div className="relative w-full">
  <input
    type="text"
    placeholder="Enter research topic, author, or DOI..."
    className="w-full bg-white text-black placeholder-[#737373] text-sm rounded-full py-3.5 pl-12 pr-6 shadow-md outline-none focus:shadow-lg transition-all duration-200"
  />
  <Search className="w-5 h-5 text-[#737373] absolute left-4 top-1/2 -translate-y-1/2" />
</div>
```

---

## 6. Tactile Micro-Interactions & Animation Guidelines

To keep the platform feeling responsive, lively, and modern without excess complexity:
* **Tactile Button Press:** `active:scale-95` on all clickable pills and buttons.
* **Hover Lift:** `hover:-translate-y-0.5` combined with `transition-all duration-200`.
* **Card Elevation Bloom:** `hover:shadow-lg` combined with `hover:-translate-y-1`.
* **Citation Jump Focus:** When a citation badge is clicked, the PDF reader sentence flashes a soft peach background pulse (`#ffd4a5`).

---

## 7. Iconography Rules (Lucide React & Zero-Sparkles Policy)

### 7.1 Strict Ban on AI Sparkle Icons
> [!CAUTION]
> **DO NOT USE THE SPARKLE ICON.**
> The Lucide `Sparkles`, `Wand`, `Sparkle`, or similar AI icons are strictly forbidden. The platform's AI grounding is represented through rigorous layout, clean typography, and interactive citation badges.

### 7.2 Curated Lucide React Icons
* **Navigation:** `BookOpen`, `Layers`, `Settings`, `LogOut`, `User`, `ChevronRight`, `ChevronLeft`, `X`, `Menu`
* **Search & Filter:** `Search`, `Filter`, `ArrowUpDown`, `Plus`, `Check`, `ExternalLink`
* **PDF & Reader:** `FileText`, `FileDown`, `ZoomIn`, `ZoomOut`, `Maximize2`, `Minimize2`, `RotateCw`
* **Chat & Synthesis:** `Send`, `Paperclip`, `Copy`, `RotateCcw`, `MessageSquare`
* **Status:** `CheckCircle2`, `AlertCircle`, `Clock`, `Loader2` (spin)

---

## 8. Core Screens & Layout Wireframes

### 8.1 Split-Screen Workspace (Desktop `> md` / `769px+`)
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             FLOATING PILL NAVBAR                                 │
├─────────────────────────────────────────┬────────────────────────────────────────┤
│  LEFT PANE: PDF READER (col-span-7)     │  RIGHT PANE: CHAT CONSOLE (col-span-5)  │
│  bg-white rounded-3xl shadow-md p-6     │  bg-white rounded-3xl shadow-md p-6     │
│                                         │                                        │
│  [Attention Is All You Need]  [P. 4/15] │  [User Message Bubble]                 │
│                                         │  Why is dot-product attention faster?  │
│  Scaled Dot-Product Attention:          │                                        │
│  Dot-product attention is faster and    │  [Assistant Message Bubble]            │
│  more space-efficient in practice...    │  Dot-product attention is faster...    │
│                                         │  [Doc: Attention, P. 4] ◄──(Peach Pill)│
│                                         │                                        │
│  [Zoom -] [100%] [Zoom +]               │  [Input Search Pill: Ask Buddy... [➔]] │
└─────────────────────────────────────────┴────────────────────────────────────────┘
```

---

## 9. The Single Master `index.css` Stylesheet

This is the **only CSS file in the entire project**. It imports Geist from Google Fonts, sets the global body typography, defines the strict 3-tier media query grid, and provides animation keyframes:

```css
/* ==========================================================================
   ResearchBuddy - Master Global Stylesheet
   File: src/app/index.css
   Specification: UI-SPEC-005 (v2.0.0)
   Typography: Geist Only (Google Fonts)
   Colors: Black (#000000), White (#ffffff), Crimson (#7f1e23),
           Peach (#ffd4a5), Muted Gray (#737373)
   Breakpoints: Strict 3-Tier Grid (> md, md to sm, < sm)
   ========================================================================== */

/* 1. GOOGLE FONTS IMPORT (GEIST SANS ONLY) */
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap');

/* 2. TAILWIND DIRECTIVES */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 3. BASE NORMALIZATION & BODY FONT ASSIGNMENT */
body {
  font-family: 'Geist', sans-serif;
  background-color: #ffffff;
  color: #000000;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 4. KEYFRAME ANIMATIONS */
@keyframes citationPulse {
  0% { background-color: rgba(255, 212, 165, 0.9); }
  50% { background-color: rgba(255, 212, 165, 0.3); }
  100% { background-color: rgba(255, 212, 165, 0.9); }
}

@keyframes typewriterPulse {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1.0; transform: scale(1.2); }
}

.citation-focus-pulse {
  animation: citationPulse 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.typewriter-dot {
  animation: typewriterPulse 1.0s infinite ease-in-out;
}

/* ==========================================================================
   5. STRICT 3-TIER RESPONSIVE BREAKPOINT GRID
   ========================================================================== */

/* --------------------------------------------------------------------------
   TIER 1: DESKTOP (> md / min-width: 769px)
   -------------------------------------------------------------------------- */
@media (min-width: 769px) {
  .app-viewport-container {
    max-width: 1440px;
    margin: 0 auto;
    padding: 1.5rem 2.0rem;
  }

  .split-workspace-grid {
    display: grid;
    grid-template-columns: 58% 42%;
    gap: 1.5rem;
    height: calc(100vh - 6.5rem);
    overflow: hidden;
  }

  .mobile-only {
    display: none !important;
  }
}

/* --------------------------------------------------------------------------
   TIER 2: TABLET (sm to md / min-width: 640px and max-width: 768px)
   -------------------------------------------------------------------------- */
@media (min-width: 640px) and (max-width: 768px) {
  .app-viewport-container {
    width: 100%;
    padding: 1.0rem 1.25rem;
  }

  .split-workspace-grid {
    display: flex;
    flex-direction: column;
    gap: 1.0rem;
    height: auto;
    min-height: calc(100vh - 6.0rem);
  }

  .mobile-only {
    display: none !important;
  }
}

/* --------------------------------------------------------------------------
   TIER 3: MOBILE (< sm / max-width: 639px)
   -------------------------------------------------------------------------- */
@media (max-width: 639px) {
  .app-viewport-container {
    width: 100%;
    padding: 0.75rem 0.75rem 5.0rem 0.75rem; /* Room for bottom bar */
  }

  .split-workspace-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: auto;
  }

  .desktop-only {
    display: none !important;
  }
}
```

---

## 10. Conclusion & Implementation Sign-off
This revised specification strictly aligns with the project's visual constraints: **Geist font globally**, **exact 5 colors only**, **zero borders across the entire platform**, **native Tailwind CSS in-built classes**, and the **strict 3-tier responsive grid** in a clean, single `index.css`. All future frontend implementation must directly follow [`Docs/5_UI_UX_DESIGN_SPECIFICATION.md`](file:///d:/Coding/My%20Projects/research-buddy/Docs/5_UI_UX_DESIGN_SPECIFICATION.md).
