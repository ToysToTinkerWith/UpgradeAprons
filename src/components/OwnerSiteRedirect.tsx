"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function OwnerSiteRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050403] px-6 text-[#f7f1e8]">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#e7ad61]">
        Opening site editor
      </p>
    </main>
  );
}
