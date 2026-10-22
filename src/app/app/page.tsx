"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SubsProvider } from "@/components/store";
import { Dashboard, DashboardSkeleton } from "@/components/dashboard";

function Inner() {
  const demo = useSearchParams().get("demo") === "1";
  return (
    <SubsProvider key={demo ? "demo" : "real"} demo={demo}>
      <Dashboard />
    </SubsProvider>
  );
}

export default function AppPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Inner />
    </Suspense>
  );
}
