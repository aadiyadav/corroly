import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./index.css";
import { StoreProvider } from "@/store/StoreProvider";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import logoImg from "@/assets/logo.webp";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Corroly",
  description: "Enterprise-grade RAG platform for literature discovery, lossless PDF study, and grounded research synthesis.",
  icons: {
    icon: logoImg.src,
    shortcut: logoImg.src,
    apple: logoImg.src,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`scroll-smooth ${montserrat.variable} ${montserrat.className}`}>
      <body className={`${montserrat.className} bg-white text-black min-h-screen antialiased selection:bg-[#ffd4a5] selection:text-black`}>
        <StoreProvider>
          <SmoothScroll>{children}</SmoothScroll>
        </StoreProvider>
      </body>
    </html>
  );
}

