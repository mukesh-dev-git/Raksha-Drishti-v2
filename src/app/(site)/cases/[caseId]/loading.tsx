import { SkelTitleBand, SkelTwoColDetail } from "@/components/ui/Skeleton";

// No PageShell here (unlike the static-copy pages) - the title is the
// case's own title, which only getWorklistCase()'s live fetch knows, so a
// real PageShell would either show nothing or a wrong placeholder. A fully
// skeleton title band is the honest option.
export default function CaseDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-content px-4 pb-16">
      <SkelTitleBand withDescription={false} />
      <div className="mt-8">
        <SkelTwoColDetail leftCards={3} rightCards={2} />
      </div>
    </main>
  );
}
