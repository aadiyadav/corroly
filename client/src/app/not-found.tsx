"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Direct back to previous valid URL or fallback to /repositories
    const previousUrl =
      typeof window !== "undefined" ? sessionStorage.getItem("last_valid_url") : null;
    const target = previousUrl || "/repositories";
    router.replace(target);
  }, [router]);

  return (
    <div className="h-screen w-screen bg-white flex flex-col items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[#7f1e23]" />
    </div>
  );
}
