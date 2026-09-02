import { SkelTitleBand, SkelStatRow, SkelTable } from "@/components/ui/Skeleton";

// Dynamic title (the district's own name, from getDistrictStat()'s live
// fetch) - skeleton band, not PageShell, same reasoning as
// cases/[caseId]/loading.tsx.
export default function DistrictDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-content px-4 pb-16">
      <SkelTitleBand />
      <div className="mt-8 space-y-5">
        <div className="w-1/2">
          <SkelStatRow count={2} />
        </div>
        <SkelTable rows={10} cols={6} />
      </div>
    </main>
  );
}
