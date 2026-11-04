"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function WorkspaceRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/repositories");
  }, [router]);

  return (
    <div className="h-screen w-screen bg-white flex flex-col items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-[#7f1e23]" />
    </div>
  );
}
