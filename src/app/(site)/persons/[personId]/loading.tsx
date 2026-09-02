import { SkelTitleBand, SkelStatRow, SkelCard } from "@/components/ui/Skeleton";

// Dynamic title (the person's own name) - skeleton band, same reasoning as
// cases/[caseId]/loading.tsx.
export default function PersonDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-content px-4 pb-16">
      <SkelTitleBand />
      <div className="mt-8 space-y-5">
        <SkelStatRow count={3} />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_1.3fr]">
          <SkelCard lines={4} />
          <SkelCard lines={4} />
        </div>
      </div>
    </main>
  );
}
